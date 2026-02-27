import { Search } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { useSearch } from '../../lib/SearchContext';

export default function Header({ title }) {
  const { user } = useAuthStore();
  const { searchQuery, setSearchQuery } = useSearch();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="lg:hidden w-8" /> {/* Spacer for mobile menu button */}
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:flex items-center bg-gray-50 rounded-lg px-3 py-2">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-gray-600 ml-2 w-40"
          />
        </div>

        {/* Avatar */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
