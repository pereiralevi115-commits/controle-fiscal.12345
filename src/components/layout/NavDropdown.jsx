import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function NavDropdown({ label, triggerIcon: TriggerIcon, isActive, items }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all outline-none ${
            isActive ? 'bg-[#FDB913] text-slate-900' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {TriggerIcon && <TriggerIcon className="w-4 h-4 shrink-0" />}
          <span className="hidden sm:block">{label}</span>
          <ChevronDown className="w-4 h-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {items.map(sub => {
          const SubIcon = sub.icon;
          return (
            <DropdownMenuItem key={sub.path} asChild>
              <Link to={sub.path} className="flex items-center gap-2 cursor-pointer">
                {SubIcon && <SubIcon className="w-4 h-4 shrink-0" />}
                <span>{sub.name}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}