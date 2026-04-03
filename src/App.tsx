import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  Plus,
  Bookmark,
  Menu,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  SlidersHorizontal,
  RotateCcw,
  Users,
  RefreshCw,
} from 'lucide-react';
import './app/globals.css';

// Types
interface Problem {
  contestId: number;
  index: string;
  name: string;
  type: string;
  points?: number;
  rating?: number;
  tags: string[];
  solvedCount: number;
  contestName: string;
  contestStartTimeSeconds?: number;
  category: string;
}

interface TrackedUser {
  handle: string;
  color: string;
  submissions: Map<string, string>;
  solvedProblems: Set<string>;
  lastUpdated: number;
}

interface Filters {
  divisions: string[];
  indexFrom: string;
  indexTo: string;
  ratingFrom: number | '';
  ratingTo: number | '';
  solvedFrom: number | '';
  solvedTo: number | '';
  yearFrom: number | '';
  yearTo: number | '';
  tags: string[];
  tagMode: 'AND' | 'OR';
  status: 'all' | 'solved' | 'unsolved';
  search: string;
}

// Constants
const DIVISIONS = [
  { id: 'Div. 1', label: 'Div 1' },
  { id: 'Div. 2', label: 'Div 2' },
  { id: 'Div. 3', label: 'Div 3' },
  { id: 'Div. 4', label: 'Div 4' },
  { id: 'Div. 1 + Div. 2', label: 'Div 1+2' },
  { id: 'Educational', label: 'Educational' },
  { id: 'Global', label: 'Global' },
  { id: 'Other', label: 'Other' },
];

const INDICES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const RATING_OPTIONS = [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500];

const USER_COLORS = [
  '#58a6ff', '#238636', '#d29922', '#f778ba', '#8957e5', '#3fb950', '#79c0ff'
];

const ALL_TAGS = [
  '2-sat', 'binary search', 'bitmasks', 'brute force', 'chinese remainder theorem',
  'combinatorics', 'constructive algorithms', 'data structures', 'dfs and similar',
  'divide and conquer', 'dp', 'dsu', 'expression parsing', 'fft', 'flows',
  'games', 'geometry', 'graph matchings', 'graphs', 'greedy', 'hashing',
  'implementation', 'interactive', 'math', 'matrices', 'meet-in-the-middle',
  'number theory', 'probabilities', 'schedules', 'shortest paths', 'sortings',
  'string suffix structures', 'strings', 'ternary search', 'trees', 'two pointers'
];

// Special contest IDs
const OTHER_CATEGORY_CONTESTS: number[] = [2010];
const DIV12_CATEGORY_CONTESTS: number[] = [1930, 2029];

// Helper functions
const getCategoryFromContestName = (name: string, contestId: number): string => {
  if (OTHER_CATEGORY_CONTESTS.includes(contestId)) return 'Other';
  if (DIV12_CATEGORY_CONTESTS.includes(contestId)) return 'Div. 1 + Div. 2';

  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('global round') || lowerName.includes('global')) return 'Global';
  if (lowerName.includes('educational')) return 'Educational';
  if (lowerName.includes('good bye') || lowerName.includes('hello ')) return 'Div. 1 + Div. 2';
  
  const normalizedName = name
    .replace(/Div\.2/gi, 'Div. 2')
    .replace(/Div\.1/gi, 'Div. 1')
    .replace(/Div 2/gi, 'Div. 2')
    .replace(/Div 1/gi, 'Div. 1');
  
  const div1Index = normalizedName.indexOf('Div. 1');
  const div2Index = normalizedName.indexOf('Div. 2');
  const div3Index = normalizedName.indexOf('Div. 3');
  const div4Index = normalizedName.indexOf('Div. 4');
  
  if (div1Index !== -1 && div2Index !== -1) return 'Div. 1 + Div. 2';
  if (div4Index !== -1) return 'Div. 4';
  if (div3Index !== -1) return 'Div. 3';
  if (div2Index !== -1) return 'Div. 2';
  if (div1Index !== -1) return 'Div. 1';
  
  return 'Other';
};

const getRatingBgColor = (rating?: number): string => {
  if (!rating) return 'bg-gray-500';
  if (rating < 1200) return 'bg-gray-400';
  if (rating < 1400) return 'bg-green-400';
  if (rating < 1600) return 'bg-cyan-400';
  if (rating < 1900) return 'bg-blue-400';
  if (rating < 2100) return 'bg-purple-400';
  if (rating < 2300) return 'bg-orange-400';
  if (rating < 2400) return 'bg-amber-400';
  if (rating < 2600) return 'bg-red-400';
  if (rating < 3000) return 'bg-red-600';
  return 'bg-red-800';
};

const formatDate = (timestamp?: number): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Custom hook for resizable sidebar
function useResizableSidebar(minWidth: number = 280, maxWidth: number = 420, defaultWidth: number = 340) {
  const [sidebarWidth, setSidebarWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing, minWidth, maxWidth]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  return { sidebarWidth, sidebarRef, startResizing, isResizing };
}

// Range Select Component
interface RangeSelectProps {
  label: string;
  fromValue: number | string;
  toValue: number | string;
  onFromChange: (value: any) => void;
  onToChange: (value: any) => void;
  options: (number | string)[];
}

function RangeSelect({ label, fromValue, toValue, onFromChange, onToChange, options }: RangeSelectProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <select
          value={fromValue}
          onChange={(e) => onFromChange(e.target.value === '' ? '' : isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
          className="flex-1 px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none transition-colors cursor-pointer"
        >
          <option value="">from</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <span className="text-gray-500 font-bold">—</span>
        <select
          value={toValue}
          onChange={(e) => onToChange(e.target.value === '' ? '' : isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
          className="flex-1 px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none transition-colors cursor-pointer"
        >
          <option value="">to</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Accordion Section Component
interface AccordionSectionProps {
  title: string;
  badge?: string | number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionSection({ title, badge, children, defaultOpen = true }: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#0d1117]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-[#161b22] hover:bg-[#21262d] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-white text-sm">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">{badge}</span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}

// Main Component
export default function CodeforcesFilter() {
  // State
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshingUsers, setRefreshingUsers] = useState(false);
  
  // Resizable sidebar
  const { sidebarWidth, sidebarRef, startResizing, isResizing } = useResizableSidebar(280, 420, 340);
  
  // Filters
  const [filters, setFilters] = useState<Filters>({
    divisions: [],
    indexFrom: '',
    indexTo: '',
    ratingFrom: '',
    ratingTo: '',
    solvedFrom: '',
    solvedTo: '',
    yearFrom: '',
    yearTo: '',
    tags: [],
    tagMode: 'OR',
    status: 'all',
    search: '',
  });
  
  // User tracking
  const [trackedUsers, setTrackedUsers] = useState<TrackedUser[]>([]);
  const [newHandle, setNewHandle] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  
  // Bookmarks
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Sorting
  const [sortField, setSortField] = useState<'date' | 'rating' | 'solved' | 'id'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load saved data
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('cf-bookmarks');
    if (savedBookmarks) setBookmarks(new Set(JSON.parse(savedBookmarks)));
    
    const savedFilters = localStorage.getItem('cf-filters');
    if (savedFilters) setFilters(JSON.parse(savedFilters));
    
    const savedUsers = localStorage.getItem('cf-users');
    if (savedUsers) {
      const users = JSON.parse(savedUsers);
      setTrackedUsers(users.map((u: any) => ({
        ...u,
        submissions: new Map(Object.entries(u.submissions)),
        solvedProblems: new Set(u.solvedProblems || [])
      })));
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('cf-bookmarks', JSON.stringify([...bookmarks]));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('cf-filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    const usersToSave = trackedUsers.map(u => ({
      ...u,
      submissions: Object.fromEntries(u.submissions),
      solvedProblems: [...u.solvedProblems]
    }));
    localStorage.setItem('cf-users', JSON.stringify(usersToSave));
  }, [trackedUsers]);

  // Fetch problems with caching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Check cache first
        const cachedData = localStorage.getItem('cf-problems-cache');
        const cacheTime = localStorage.getItem('cf-problems-cache-time');
        const now = Date.now();
        
        if (cachedData && cacheTime && now - parseInt(cacheTime) < 30 * 60 * 1000) {
          // Use cached data if less than 30 minutes old
          const parsed = JSON.parse(cachedData);
          setProblems(parsed);
          setFilteredProblems(parsed);
          setLoading(false);
          return;
        }
        
        // Fetch fresh data
        const [problemsRes, contestsRes] = await Promise.all([
          axios.get('https://codeforces.com/api/problemset.problems'),
          axios.get('https://codeforces.com/api/contest.list')
        ]);
        
        const problemData = problemsRes.data.result.problems;
        const problemStats = problemsRes.data.result.problemStatistics;
        const contests = contestsRes.data.result;
        
        const statsMap = new Map();
        problemStats.forEach((stat: any) => {
          statsMap.set(`${stat.contestId}-${stat.index}`, stat.solvedCount);
        });
        
        const contestMap = new Map();
        contests.forEach((contest: any) => {
          contestMap.set(contest.id, {
            name: contest.name,
            startTimeSeconds: contest.startTimeSeconds,
          });
        });
        
        const enrichedProblems: Problem[] = problemData.map((p: any) => {
          const contest = contestMap.get(p.contestId);
          return {
            ...p,
            solvedCount: statsMap.get(`${p.contestId}-${p.index}`) || 0,
            contestName: contest?.name || 'Unknown Contest',
            contestStartTimeSeconds: contest?.startTimeSeconds,
            category: getCategoryFromContestName(contest?.name || '', p.contestId),
          };
        });
        
        enrichedProblems.sort((a, b) => 
          (b.contestStartTimeSeconds || 0) - (a.contestStartTimeSeconds || 0)
        );
        
        // Cache the data
        localStorage.setItem('cf-problems-cache', JSON.stringify(enrichedProblems));
        localStorage.setItem('cf-problems-cache-time', now.toString());
        
        setProblems(enrichedProblems);
        setFilteredProblems(enrichedProblems);
      } catch (err) {
        setError('Failed to fetch data from Codeforces API');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Refresh all tracked users
  const refreshAllUsers = async () => {
    if (trackedUsers.length === 0) return;
    
    setRefreshingUsers(true);
    const updatedUsers: TrackedUser[] = [];
    
    for (const user of trackedUsers) {
      try {
        const res = await axios.get(`https://codeforces.com/api/user.status?handle=${user.handle}`);
        const submissions = res.data.result;
        
        const submissionMap = new Map<string, string>();
        const solvedProblems = new Set<string>();
        
        submissions.forEach((sub: any) => {
          const key = `${sub.contestId}-${sub.problem.index}`;
          if (!submissionMap.has(key) || sub.verdict === 'OK') {
            submissionMap.set(key, sub.verdict);
          }
          if (sub.verdict === 'OK') {
            solvedProblems.add(key);
          }
        });
        
        updatedUsers.push({
          ...user,
          submissions: submissionMap,
          solvedProblems,
          lastUpdated: Date.now(),
        });
      } catch (err) {
        console.error(`Failed to refresh ${user.handle}:`, err);
        updatedUsers.push(user);
      }
    }
    
    setTrackedUsers(updatedUsers);
    setRefreshingUsers(false);
  };

  // Build problem status map
  const problemStatusMap = useMemo(() => {
    const map = new Map<string, { solved: boolean; attempted: boolean; users: TrackedUser[] }>();
    
    if (trackedUsers.length === 0) return map;
    
    problems.forEach(p => {
      const key = `${p.contestId}-${p.index}`;
      const solvedUsers: TrackedUser[] = [];
      let attempted = false;
      
      trackedUsers.forEach(user => {
        const verdict = user.submissions.get(key);
        if (verdict === 'OK') {
          solvedUsers.push(user);
        } else if (verdict && verdict !== 'OK') {
          attempted = true;
        }
      });
      
      map.set(key, { solved: solvedUsers.length > 0, attempted: attempted && solvedUsers.length === 0, users: solvedUsers });
    });
    
    return map;
  }, [problems, trackedUsers]);

  // Calculate stats
  const stats = useMemo(() => {
    if (trackedUsers.length === 0) return { solved: 0, unsolved: 0, attempted: 0 };
    
    let solved = 0;
    let attempted = 0;
    
    filteredProblems.forEach(p => {
      const key = `${p.contestId}-${p.index}`;
      const status = problemStatusMap.get(key);
      if (status?.solved) solved++;
      else if (status?.attempted) attempted++;
    });
    
    return {
      solved,
      unsolved: filteredProblems.length - solved - attempted,
      attempted
    };
  }, [filteredProblems, problemStatusMap, trackedUsers.length]);

  // Apply filters
  useEffect(() => {
    let result = [...problems];
    
    if (filters.divisions.length > 0) {
      result = result.filter(p => filters.divisions.includes(p.category));
    }
    
    if (filters.indexFrom || filters.indexTo) {
      result = result.filter(p => {
        const idx = p.index[0];
        return (!filters.indexFrom || idx >= filters.indexFrom) && 
               (!filters.indexTo || idx <= filters.indexTo);
      });
    }
    
    if (filters.ratingFrom !== '' || filters.ratingTo !== '') {
      result = result.filter(p => {
        if (!p.rating) return false;
        return (filters.ratingFrom === '' || p.rating >= filters.ratingFrom) && 
               (filters.ratingTo === '' || p.rating <= filters.ratingTo);
      });
    }
    
    if (filters.solvedFrom !== '' || filters.solvedTo !== '') {
      result = result.filter(p => 
        (filters.solvedFrom === '' || p.solvedCount >= filters.solvedFrom) && 
        (filters.solvedTo === '' || p.solvedCount <= filters.solvedTo)
      );
    }
    
    if (filters.yearFrom !== '' || filters.yearTo !== '') {
      result = result.filter(p => {
        if (!p.contestStartTimeSeconds) return false;
        const year = new Date(p.contestStartTimeSeconds * 1000).getFullYear();
        return (filters.yearFrom === '' || year >= filters.yearFrom) && 
               (filters.yearTo === '' || year <= filters.yearTo);
      });
    }
    
    if (filters.tags.length > 0) {
      result = result.filter(p => 
        filters.tagMode === 'AND' 
          ? filters.tags.every(tag => p.tags.includes(tag))
          : filters.tags.some(tag => p.tags.includes(tag))
      );
    }
    
    // Status filter - FIXED
    if (filters.status !== 'all' && trackedUsers.length > 0) {
      result = result.filter(p => {
        const key = `${p.contestId}-${p.index}`;
        const status = problemStatusMap.get(key);
        if (filters.status === 'solved') return status?.solved || false;
        if (filters.status === 'unsolved') return !status?.solved;
        return true;
      });
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        `${p.contestId}${p.index}`.toLowerCase().includes(searchLower) ||
        p.contestId.toString().includes(searchLower)
      );
    }
    
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date': comparison = (a.contestStartTimeSeconds || 0) - (b.contestStartTimeSeconds || 0); break;
        case 'rating': comparison = (a.rating || 0) - (b.rating || 0); break;
        case 'solved': comparison = a.solvedCount - b.solvedCount; break;
        case 'id': comparison = a.contestId - b.contestId; break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredProblems(result);
    setCurrentPage(1);
  }, [problems, filters, sortField, sortDirection, problemStatusMap]);

  // Add user
  const addUser = async () => {
    if (!newHandle.trim()) return;
    if (trackedUsers.length >= 7) {
      alert('Maximum 7 users can be tracked');
      return;
    }
    if (trackedUsers.some(u => u.handle.toLowerCase() === newHandle.trim().toLowerCase())) {
      alert('User already tracked');
      return;
    }
    
    setUserLoading(true);
    try {
      const res = await axios.get(`https://codeforces.com/api/user.status?handle=${newHandle.trim()}`);
      const submissions = res.data.result;
      
      const submissionMap = new Map<string, string>();
      const solvedProblems = new Set<string>();
      
      submissions.forEach((sub: any) => {
        const key = `${sub.contestId}-${sub.problem.index}`;
        if (!submissionMap.has(key) || sub.verdict === 'OK') {
          submissionMap.set(key, sub.verdict);
        }
        if (sub.verdict === 'OK') {
          solvedProblems.add(key);
        }
      });
      
      const newUser: TrackedUser = {
        handle: newHandle.trim(),
        color: USER_COLORS[trackedUsers.length % USER_COLORS.length],
        submissions: submissionMap,
        solvedProblems,
        lastUpdated: Date.now(),
      };
      
      setTrackedUsers([...trackedUsers, newUser]);
      setNewHandle('');
    } catch (err) {
      alert('Failed to fetch user data. Please check the handle.');
    } finally {
      setUserLoading(false);
    }
  };

  // Remove user
  const removeUser = (handle: string) => {
    setTrackedUsers(trackedUsers.filter(u => u.handle !== handle));
  };

  // Toggle bookmark
  const toggleBookmark = (problemId: string) => {
    const newBookmarks = new Set(bookmarks);
    if (newBookmarks.has(problemId)) newBookmarks.delete(problemId);
    else newBookmarks.add(problemId);
    setBookmarks(newBookmarks);
  };

  // Toggle division
  const toggleDivision = (divId: string) => {
    const newDivs = filters.divisions.includes(divId)
      ? filters.divisions.filter(d => d !== divId)
      : [...filters.divisions, divId];
    setFilters({ ...filters, divisions: newDivs });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      divisions: [],
      indexFrom: '',
      indexTo: '',
      ratingFrom: '',
      ratingTo: '',
      solvedFrom: '',
      solvedTo: '',
      yearFrom: '',
      yearTo: '',
      tags: [],
      tagMode: 'OR',
      status: 'all',
      search: '',
    });
  };

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.divisions.length > 0) count++;
    if (filters.indexFrom || filters.indexTo) count++;
    if (filters.ratingFrom !== '' || filters.ratingTo !== '') count++;
    if (filters.solvedFrom !== '' || filters.solvedTo !== '') count++;
    if (filters.yearFrom !== '' || filters.yearTo !== '') count++;
    if (filters.tags.length > 0) count++;
    if (filters.status !== 'all') count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  // Pagination
  const totalPages = Math.ceil(filteredProblems.length / pageSize);
  const paginatedProblems = filteredProblems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Index', 'Name', 'Rating', 'Solved', 'Category', 'Date', 'Tags'];
    const rows = filteredProblems.map(p => [
      p.contestId, p.index, p.name, p.rating || 'Unrated', p.solvedCount,
      p.category, formatDate(p.contestStartTimeSeconds), p.tags.join('; '),
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codeforces-problems.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading problems...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0d1117] flex flex-col overflow-hidden">
      {/* Navbar */}
      <nav className="h-14 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4 flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-[#21262d] rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-300" />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex p-2 hover:bg-[#21262d] rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">CF</div>
            <span className="font-semibold text-lg text-white hidden sm:inline">Filter</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Track Users in Navbar */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg">
            <Users className="w-4 h-4 text-blue-400" />
            <input
              type="text"
              placeholder="Track user..."
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addUser()}
              className="w-20 bg-transparent text-sm text-white focus:outline-none placeholder:text-gray-500"
            />
            <button onClick={addUser} disabled={userLoading || !newHandle.trim()} className="p-1 hover:bg-[#21262d] rounded disabled:opacity-50 transition-colors">
              {userLoading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4 text-gray-400" />}
            </button>
            
            {trackedUsers.length > 0 && (
              <div className="flex items-center gap-1 pl-2 border-l border-[#30363d]">
                {trackedUsers.map((user) => (
                  <button
                    key={user.handle}
                    onClick={() => removeUser(user.handle)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black hover:scale-110 hover:opacity-80 transition-all"
                    style={{ backgroundColor: user.color }}
                    title={`${user.handle} (${user.solvedProblems.size} solved) - Click to remove`}
                  >
                    {user.handle[0].toUpperCase()}
                  </button>
                ))}
                <button onClick={refreshAllUsers} disabled={refreshingUsers} className="ml-1 p-1 hover:bg-blue-500/20 text-blue-400 rounded transition-colors" title="Refresh all users">
                  <RefreshCw className={`w-3 h-3 ${refreshingUsers ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
          </div>

          <a href="https://codeforces.com/problemset" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors">
            <ExternalLink className="w-4 h-4" />Problemset
          </a>
          <a href="https://codeforces.com/contests" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors">
            <ExternalLink className="w-4 h-4" />Contests
          </a>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside 
          ref={sidebarRef}
          style={{ width: sidebarOpen ? sidebarWidth : 0 }}
          className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${sidebarOpen ? 'md:block' : 'hidden'} fixed md:relative top-14 md:top-0 left-0 h-[calc(100vh-56px)] md:h-[calc(100vh-56px)] bg-[#161b22] border-r border-[#30363d] z-50 md:z-auto transition-transform duration-300 flex-shrink-0`}
        >
          <div className="h-full overflow-y-auto p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search problems..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none transition-colors placeholder:text-gray-600"
              />
            </div>

            {/* Active Filters Bar */}
            {activeFilterCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400 font-medium">{activeFilterCount} active</span>
                </div>
                <button onClick={clearAllFilters} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
                  <RotateCcw className="w-3 h-3" />Reset
                </button>
              </div>
            )}

            {/* Filter Problems Section */}
            <div className="border border-[#30363d] rounded-lg overflow-hidden bg-[#0d1117]">
              <div className="px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
                <span className="font-medium text-white text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-400" />Filter Problems
                </span>
              </div>
              <div className="p-4 space-y-4">
                {/* Year Range - Text Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Year</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.yearFrom}
                      onChange={(e) => setFilters({ ...filters, yearFrom: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="from"
                      min="2010"
                      max="2099"
                      className="flex-1 px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none transition-colors placeholder:text-gray-500 text-center"
                    />
                    <span className="text-gray-500 font-bold text-lg">—</span>
                    <input
                      type="number"
                      value={filters.yearTo}
                      onChange={(e) => setFilters({ ...filters, yearTo: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="to"
                      min="2010"
                      max="2099"
                      className="flex-1 px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none transition-colors placeholder:text-gray-500 text-center"
                    />
                  </div>
                </div>

                {/* Problem Index Range */}
                <RangeSelect
                  label="Problem Index"
                  fromValue={filters.indexFrom}
                  toValue={filters.indexTo}
                  onFromChange={(v) => setFilters({ ...filters, indexFrom: v })}
                  onToChange={(v) => setFilters({ ...filters, indexTo: v })}
                  options={INDICES}
                />

                {/* Rating Range */}
                <RangeSelect
                  label="Rating"
                  fromValue={filters.ratingFrom}
                  toValue={filters.ratingTo}
                  onFromChange={(v) => setFilters({ ...filters, ratingFrom: v })}
                  onToChange={(v) => setFilters({ ...filters, ratingTo: v })}
                  options={RATING_OPTIONS}
                />

                {/* Solved Count Range */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Solved Count</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.solvedFrom}
                      onChange={(e) => setFilters({ ...filters, solvedFrom: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="min"
                      min="0"
                      className="flex-1 px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none transition-colors placeholder:text-gray-500 text-center"
                    />
                    <span className="text-gray-500 font-bold text-lg">—</span>
                    <input
                      type="number"
                      value={filters.solvedTo}
                      onChange={(e) => setFilters({ ...filters, solvedTo: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="max"
                      min="0"
                      className="flex-1 px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none transition-colors placeholder:text-gray-500 text-center"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Division Filter */}
            <AccordionSection title="Division" badge={filters.divisions.length > 0 ? filters.divisions.length : undefined}>
              <div className="grid grid-cols-2 gap-1.5">
                {DIVISIONS.map((div) => (
                  <button
                    key={div.id}
                    onClick={() => toggleDivision(div.id)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                      filters.divisions.includes(div.id)
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-[#161b22] border-[#30363d] text-gray-400 hover:border-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {div.label}
                  </button>
                ))}
              </div>
            </AccordionSection>

            {/* Tags Filter */}
            <AccordionSection title="Tags" badge={filters.tags.length > 0 ? filters.tags.length : undefined}>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, tagMode: 'OR' })}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                      filters.tagMode === 'OR' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-[#161b22] border-[#30363d] text-gray-400 hover:border-gray-500'
                    }`}
                  >Any (OR)</button>
                  <button
                    onClick={() => setFilters({ ...filters, tagMode: 'AND' })}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                      filters.tagMode === 'AND' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-[#161b22] border-[#30363d] text-gray-400 hover:border-gray-500'
                    }`}
                  >All (AND)</button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {ALL_TAGS.map((tag) => (
                    <label key={tag} className="flex items-center gap-2 p-2 hover:bg-[#21262d] rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={filters.tags.includes(tag)}
                        onChange={() => {
                          const newTags = filters.tags.includes(tag)
                            ? filters.tags.filter(t => t !== tag)
                            : [...filters.tags, tag];
                          setFilters({ ...filters, tags: newTags });
                        }}
                        className="w-4 h-4 rounded border-[#30363d] bg-[#161b22] text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="text-sm text-gray-300">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            </AccordionSection>

            {/* Status Filter */}
            <AccordionSection title="Status" badge={filters.status !== 'all' ? 1 : undefined}>
              <div className="space-y-1.5">
                {[
                  { id: 'all', label: 'All Problems', icon: null },
                  { id: 'solved', label: 'Solved', icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
                  { id: 'unsolved', label: 'Unsolved', icon: <XCircle className="w-4 h-4 text-red-500" /> },
                ].map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => setFilters({ ...filters, status: id as any })}
                    className={`w-full px-3 py-2 text-sm font-medium rounded-lg border transition-all flex items-center gap-2 ${
                      filters.status === id
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-[#161b22] border-[#30363d] text-gray-400 hover:border-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {icon}<span>{label}</span>
                  </button>
                ))}
              </div>
            </AccordionSection>

            <div className="h-4" />
          </div>
          
          {/* Resize Handle */}
          <div onMouseDown={startResizing} className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-10 ${isResizing ? 'bg-blue-500' : 'bg-transparent'}`}>
            <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-8 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3 text-gray-500" />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
          {/* Toolbar - Fixed */}
          <div className="h-14 border-b border-[#30363d] flex items-center justify-between px-4 bg-[#161b22] flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                Showing <span className="text-white font-medium">{Math.min((currentPage - 1) * pageSize + 1, filteredProblems.length)}-{Math.min(currentPage * pageSize, filteredProblems.length)}</span> of <span className="text-white font-medium">{filteredProblems.length.toLocaleString()}</span> problems
              </span>
              
              {/* Stats */}
              {trackedUsers.length > 0 && (
                <div className="hidden sm:flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle2 className="w-3 h-3" /> {stats.solved} solved
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-3 h-3" /> {stats.unsolved} unsolved
                  </span>
                  {stats.attempted > 0 && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      attempted {stats.attempted}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={exportToCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                <Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span>
              </button>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                className="px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>

          {/* Problem Table - Scrollable */}
          <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr className="text-left bg-[#161b22]">
                  <th className="px-2 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-10 border-b border-[#30363d]"></th>
                  <th className="px-2 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-16 border-b border-[#30363d]">ID</th>
                  <th className="px-2 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-12 border-b border-[#30363d]">Idx</th>
                  <th className="px-2 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-[#30363d]">Problem</th>
                  <th 
                    className="px-2 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors border-b border-[#30363d] w-20"
                    onClick={() => {
                      if (sortField === 'rating') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      else { setSortField('rating'); setSortDirection('desc'); }
                    }}
                  >
                    <div className="flex items-center gap-1">Rating{sortField === 'rating' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                  </th>
                  <th 
                    className="px-2 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors border-b border-[#30363d] w-24"
                    onClick={() => {
                      if (sortField === 'solved') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      else { setSortField('solved'); setSortDirection('desc'); }
                    }}
                  >
                    <div className="flex items-center gap-1">Solved{sortField === 'solved' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                  </th>
                  <th className="px-2 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-[#30363d] w-28">Category</th>
                  <th 
                    className="px-2 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors border-b border-[#30363d] w-28"
                    onClick={() => {
                      if (sortField === 'date') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      else { setSortField('date'); setSortDirection('desc'); }
                    }}
                  >
                    <div className="flex items-center gap-1">Date{sortField === 'date' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                  </th>
                  <th className="px-2 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-[#30363d]">Tags</th>
                  <th className="px-2 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-16 border-b border-[#30363d]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProblems.map((problem) => {
                  const problemId = `${problem.contestId}-${problem.index}`;
                  const isBookmarked = bookmarks.has(problemId);
                  const status = problemStatusMap.get(problemId);
                  
                  return (
                    <tr key={problemId} className="group hover:bg-[#161b22]/50 transition-colors">
                      <td className="px-2 py-3 border-b border-[#21262d]">
                        <button onClick={() => toggleBookmark(problemId)} className={`transition-colors ${isBookmarked ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}>
                          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                      </td>
                      <td className="px-2 py-3 border-b border-[#21262d]"><span className="font-mono text-sm text-gray-500">{problem.contestId}</span></td>
                      <td className="px-2 py-3 border-b border-[#21262d]"><span className="font-mono text-sm text-gray-400">{problem.index}</span></td>
                      <td className="px-2 py-3 border-b border-[#21262d]">
                        <div className="flex items-center gap-2">
                          {status?.solved && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                          {status?.attempted && !status?.solved && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                          <a href={`https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white hover:text-blue-400 transition-colors truncate block max-w-[200px]" title={problem.name}>
                            {problem.name}
                          </a>
                          {status?.users && status.users.length > 0 && (
                            <div className="flex gap-0.5 ml-1">
                              {status.users.map((user) => (
                                <div key={user.handle} className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black" style={{ backgroundColor: user.color }} title={`Solved by ${user.handle}`}>
                                  {user.handle[0].toUpperCase()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 border-b border-[#21262d]">
                        {problem.rating ? (
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold min-w-[44px] ${getRatingBgColor(problem.rating)} text-black`}>
                            {problem.rating}
                          </span>
                        ) : <span className="text-gray-500 text-sm">-</span>}
                      </td>
                      <td className="px-2 py-3 border-b border-[#21262d]"><span className="text-sm text-gray-400 font-mono">{formatNumber(problem.solvedCount)}</span></td>
                      <td className="px-2 py-3 border-b border-[#21262d]"><span className="text-xs px-2 py-1 bg-[#0d1117] rounded text-gray-400 border border-[#30363d]">{problem.category}</span></td>
                      <td className="px-2 py-3 border-b border-[#21262d]"><span className="text-sm text-gray-400">{formatDate(problem.contestStartTimeSeconds)}</span></td>
                      <td className="px-2 py-3 border-b border-[#21262d]">
                        <div className="flex flex-wrap gap-1">
                          {problem.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs px-2 py-0.5 bg-[#0d1117] rounded text-gray-400 border border-[#30363d]">{tag}</span>
                          ))}
                          {problem.tags.length > 2 && <span className="text-xs px-2 py-0.5 bg-[#0d1117] rounded text-gray-500 border border-[#30363d]">+{problem.tags.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-2 py-3 border-b border-[#21262d]">
                        <a href={`https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-[#21262d] rounded-lg text-gray-400 hover:text-white transition-colors inline-flex" title="Open problem">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {paginatedProblems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <Filter className="w-12 h-12 text-gray-600 mb-4" />
                <p className="text-gray-400">No problems match your filters</p>
                <button onClick={clearAllFilters} className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">Clear Filters</button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer with Pagination */}
      <footer className="h-12 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="font-medium text-gray-400">CF Filter</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Powered by Codeforces API</span>
        </div>
        
        {/* Pagination in Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1.5 hover:bg-[#21262d] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-300 flex items-center gap-1 text-sm"
            >
              <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Prev</span>
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pageNum ? 'bg-blue-500 text-white' : 'hover:bg-[#21262d] text-gray-400'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1.5 hover:bg-[#21262d] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-300 flex items-center gap-1 text-sm"
            >
              <span className="hidden sm:inline">Next</span><ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <a href="https://codeforces.com/profile/m0stafa" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-white transition-colors">@m0stafa</a>
        </div>
      </footer>
    </div>
  );
}
