import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

// Retorna a lista de pastas conectadas, considerando o campo legado de pasta única.
function getConnectedFolders(settings) {
  if (!settings) return [];
  if (Array.isArray(settings.folders) && settings.folders.length > 0) {
    return settings.folders.filter((f) => f && f.folder_id);
  }
  if (settings.folder_id) {
    return [{ folder_id: settings.folder_id, folder_name: settings.folder_name, folder_path: settings.folder_path }];
  }
  return [];
}

async function saveResult(base44, settings, result, message) {
  if (!settings) return;
  await base44.asServiceRole.entities.OneDriveImportSettings.update(settings.id, {
    folders: getConnectedFolders(settings),
    auto_sync_enabled: settings.auto_sync_enabled,
    last_sync_at: new Date().toISOString(),
    last_sync_message: message,
    last_import_total: result.total || 0,
    last_import_success: result.success || 0,
    last_import_errors: result.errors || 0,
  });
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

async function importFolder(base44, accessToken, folderId) {
  const children = await graphRequest(
    accessToken,
    `/me/drive/items/${folderId}/children?$select=id,name,file&$top=200`
  );

  const xmlFiles = (children?.value || []).filter(
    (item) => item.file && item.name?.toLowerCase().endsWith('.xml')
  );

  if (xmlFiles.length === 0) {
    return { success: 0, errors: 0, error_details: [], total: 0 };
  }

  const xmlContents = [];
  const fileErrors = [];

  for (const file of xmlFiles) {
    try {
      xmlContents.push(await downloadFileText(accessToken, file.id));
    } catch (error) {
      fileErrors.push({ error: `${file.name}: ${error.message}` });
    }
  }

  const result = xmlContents.length > 0
    ? await importXmlContents(base44, xmlContents)
    : { success: 0, errors: 0, error_details: [], total: 0 };

  return {
    ...result,
    total: xmlFiles.length,
    errors: result.errors + fileErrors.length,
    error_details: result.error_details.concat(
      fileErrors.map((item, index) => ({ index: result.total + index, error: item.error }))
    ),
  };
}

async function hasRelevantChange(accessToken, folderId, notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return true;
  }

  for (const notification of notifications) {
    const itemId = notification?.resourceData?.id;
    if (!itemId) continue;
    try {
      const item = await graphRequest(accessToken, `/me/drive/items/${itemId}?$select=id,name,parentReference,folder,file`);
      if (item?.id === folderId || item?.parentReference?.id === folderId) {
        return true;
      }
    } catch (_) {
      return true;
    }
  }

  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const settings = await getSettings(base44);
    const connectedFolders = getConnectedFolders(settings);

    if (!settings?.auto_sync_enabled || connectedFolders.length === 0) {
      return Response.json({ skipped: true, reason: 'Sincronização automática desativada.' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');
    const notifications = payload?.data?.value || [];

    // Verifica se a alteração pertence a alguma das pastas monitoradas.
    let anyRelevant = notifications.length === 0;
    if (!anyRelevant) {
      for (const folder of connectedFolders) {
        if (await hasRelevantChange(accessToken, folder.folder_id, notifications)) {
          anyRelevant = true;
          break;
        }
      }
    }

    if (!anyRelevant) {
      return Response.json({ skipped: true, reason: 'Alteração fora das pastas monitoradas.' });
    }

    // Importa todas as pastas conectadas e acumula os resultados.
    const totals = { success: 0, errors: 0, total: 0, error_details: [] };
    for (const folder of connectedFolders) {
      const result = await importFolder(base44, accessToken, folder.folder_id);
      totals.success += result.success || 0;
      totals.errors += result.errors || 0;
      totals.total += result.total || 0;
      totals.error_details = totals.error_details.concat(result.error_details || []);
    }

    const message = totals.total === 0
      ? 'Nenhum XML encontrado nas pastas monitoradas.'
      : `${totals.success} importada(s), ${totals.errors} erro(s) (${connectedFolders.length} pasta(s))`;

    await saveResult(base44, settings, totals, message);
    return Response.json({ ok: true, result: totals });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});