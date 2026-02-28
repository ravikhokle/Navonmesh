import { Search } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { useSearch } from '../../lib/SearchContext';

export default function Header({ title }) {
  const { user } = useAuthStore();
  const { searchQuery, setSearchQuery } = useSearch();

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/60 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <div className="lg:hidden w-8" />
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 py-2 transition-all focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100 focus-within:bg-white">
          <Search size={15} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search emergencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-gray-700 ml-2 w-48 placeholder:text-gray-400"
          />
        </div>

        {/* Avatar + info */}
        <div className="hidden sm:flex items-center gap-2.5 bg-gray-50/80 rounded-xl px-3 py-1.5 border border-gray-200/60">
          <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center shadow-sm shadow-red-500/20">
            <span className="text-[10px] font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.name || 'User'}</p>
            <p className="text-[10px] text-gray-400 capitalize leading-tight">{user?.role || 'citizen'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
