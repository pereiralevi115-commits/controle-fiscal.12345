import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function getPathLabel(item) {
  const basePath = item?.parentReference?.path?.replace('/drive/root:', '') || '';
  const fullPath = `${basePath}/${item?.name || ''}`.replace(/\/+/g, '/');
  return fullPath || '/';
}

async function graphRequest(accessToken, path, options = {}) {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Graph API error: ${response.status} ${await response.text()}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function downloadFileText(accessToken, fileId) {
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Falha ao baixar arquivo: ${response.status} ${await response.text()}`);
  }

  return await response.text();
}

async function getSettings(base44) {
  const settings = await base44.asServiceRole.entities.OneDriveImportSettings.filter({ key: 'default' });
  return settings[0] || null;
}

async function saveSettings(base44, data) {
  const existing = await getSettings(base44);
  const payload = {
    ...data,
    key: 'default',
  };

  if (existing) {
    return await base44.asServiceRole.entities.OneDriveImportSettings.update(existing.id, payload);
  }

  return await base44.asServiceRole.entities.OneDriveImportSettings.create(payload);
}

function normalizeParseResponse(response) {
  return response?.data || response;
}

async function importXmlContents(base44, xmlContents) {
  const batchSize = 5;
  let success = 0;
  let errors = 0;
  let errorDetails = [];

  for (let index = 0; index < xmlContents.length; index += batchSize) {
    const batch = xmlContents.slice(index, index + batchSize);
    const response = await base44.functions.invoke('parseXml', { xml_contents: batch });
    const data = normalizeParseResponse(response);

    success += data.success || 0;
    errors += data.errors || 0;
    errorDetails = errorDetails.concat(
      (data.error_details || []).map((item) => ({
        ...item,
        index: item.index + index,
      }))
    );
  }

  return {
    success,
    errors,
    error_details: errorDetails,
    total: xmlContents.length,
  };
}

async function listFolderItems(accessToken, parentId) {
  const currentFolder = parentId
    ? await graphRequest(accessToken, `/me/drive/items/${parentId}?$select=id,name,parentReference,folder`)
    : { id: 'root', name: 'Raiz do OneDrive', pathLabel: '/' };

  const childrenPath = parentId
    ? `/me/drive/items/${parentId}/children?$select=id,name,parentReference,folder,file,size,lastModifiedDateTime&$top=200`
    : `/me/drive/root/children?$select=id,name,parentReference,folder,file,size,lastModifiedDateTime&$top=200`;

  const response = await graphRequest(accessToken, childrenPath);
  const items = response?.value || [];
  const folders = items
    .filter((item) => item.folder)
    .map((item) => ({
      id: item.id,
      name: item.name,
      pathLabel: getPathLabel(item),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const xmlFiles = items.filter((item) => item.file && item.name?.toLowerCase().endsWith('.xml'));

  return {
    currentFolder: parentId
      ? {
          id: currentFolder.id,
          name: currentFolder.name,
          pathLabel: getPathLabel(currentFolder),
        }
      : currentFolder,
    folders,
    xmlFileCount: xmlFiles.length,
  };
}

async function importFolderById(base44, accessToken, folderId) {
  const children = await graphRequest(
    accessToken,
    `/me/drive/items/${folderId}/children?$select=id,name,file&$top=200`
  );

  const xmlFiles = (children?.value || []).filter(
    (item) => item.file && item.name?.toLowerCase().endsWith('.xml')
  );

  if (xmlFiles.length === 0) {
    return {
      success: 0,
      errors: 0,
      error_details: [],
      total: 0,
      files: [],
    };
  }

  const xmlContents = [];
  const fileErrors = [];

  for (const file of xmlFiles) {
    try {
      const content = await downloadFileText(accessToken, file.id);
      xmlContents.push(content);
    } catch (error) {
      fileErrors.push({ error: `${file.name}: ${error.message}` });
    }
  }

  const importResult = xmlContents.length > 0
    ? await importXmlContents(base44, xmlContents)
    : { success: 0, errors: 0, error_details: [], total: 0 };

  return {
    ...importResult,
    errors: importResult.errors + fileErrors.length,
    error_details: importResult.error_details.concat(
      fileErrors.map((item, index) => ({ index: importResult.total + index, error: item.error }))
    ),
    total: xmlFiles.length,
    files: xmlFiles.map((file) => ({ id: file.id, name: file.name })),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { action, parentId, folderId, folderName, folderPath, autoSyncEnabled, fileIds } = payload || {};
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');

    if (action === 'getStatus') {
      const settings = await getSettings(base44);
      return Response.json({ settings });
    }

    if (action === 'listFolderItems') {
      const data = await listFolderItems(accessToken, parentId);
      return Response.json(data);
    }

    if (action === 'saveSettings') {
      const current = await getSettings(base44);
      const settings = await saveSettings(base44, {
        folder_id: folderId ?? current?.folder_id,
        folder_name: folderName ?? current?.folder_name,
        folder_path: folderPath ?? current?.folder_path,
        auto_sync_enabled: typeof autoSyncEnabled === 'boolean' ? autoSyncEnabled : (current?.auto_sync_enabled || false),
      });
      return Response.json({ settings });
    }

    if (action === 'importFolder') {
      const settings = await getSettings(base44);
      const effectiveFolderId = folderId || settings?.folder_id;
      if (!effectiveFolderId) {
        return Response.json({ error: 'Selecione uma pasta do OneDrive primeiro.' }, { status: 400 });
      }

      const result = await importFolderById(base44, accessToken, effectiveFolderId);
      await saveSettings(base44, {
        folder_id: folderId || settings?.folder_id,
        folder_name: folderName || settings?.folder_name,
        folder_path: folderPath || settings?.folder_path,
        auto_sync_enabled: settings?.auto_sync_enabled || false,
        last_sync_at: new Date().toISOString(),
        last_sync_message: result.total === 0
          ? 'Nenhum XML encontrado na pasta selecionada.'
          : `${result.success} importada(s), ${result.errors} erro(s)`,
        last_import_total: result.total,
        last_import_success: result.success,
        last_import_errors: result.errors,
      });
      return Response.json(result);
    }

    if (action === 'importFiles') {
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return Response.json({ error: 'Selecione pelo menos um arquivo.' }, { status: 400 });
      }

      const xmlContents = [];
      const fileErrors = [];
      for (const fileId of fileIds) {
        try {
          const metadata = await graphRequest(accessToken, `/me/drive/items/${fileId}?$select=id,name,file`);
          if (!metadata?.file || !metadata.name?.toLowerCase().endsWith('.xml')) {
            fileErrors.push({ error: `${metadata?.name || fileId}: arquivo inválido` });
            continue;
          }
          xmlContents.push(await downloadFileText(accessToken, fileId));
        } catch (error) {
          fileErrors.push({ error: `${fileId}: ${error.message}` });
        }
      }

      const result = xmlContents.length > 0
        ? await importXmlContents(base44, xmlContents)
        : { success: 0, errors: 0, error_details: [], total: 0 };

      return Response.json({
        ...result,
        total: fileIds.length,
        errors: result.errors + fileErrors.length,
        error_details: result.error_details.concat(
          fileErrors.map((item, index) => ({ index: result.total + index, error: item.error }))
        ),
      });
    }

    return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});