'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  User,
  Plus,
  Trash2,
  Bookmark,
  Menu,
  CheckCircle2,
  XCircle,
  Timer,
  Cpu,
  AlertCircle,
  MoreHorizontal,
  FileText,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from 'lucide-react';

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
}

interface Filters {
  divisions: string[];
  indices: string[];
  ratingMin: number;
  ratingMax: number;
  solvedMin: number;
  solvedMax: number;
  yearMin: number;
  yearMax: number;
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

const MIN_RATING = 800;
const MAX_RATING = 3500;
const RATING_STEP = 100;

const MIN_SOLVED = 0;
const MAX_SOLVED = 500000;
const SOLVED_STEP = 1000;

// Helper functions
const getCategoryFromContestName = (name: string): string => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('educational')) {
    return 'Educational';
  }
  
  if (lowerName.includes('global')) {
    return 'Global';
  }
  
  if (lowerName.includes('div. 1 + div. 2') || lowerName.includes('div.1+div.2')) {
    return 'Div. 1 + Div. 2';
  }
  
  if (lowerName.includes('div. 4')) return 'Div. 4';
  if (lowerName.includes('div. 3')) return 'Div. 3';
  if (lowerName.includes('div. 2')) return 'Div. 2';
  if (lowerName.includes('div. 1')) return 'Div. 1';
  
  return 'Other';
};

const getRatingBgColor = (rating?: number): string => {
  if (!rating) return 'bg-[#6e7681]';
  if (rating < 1200) return 'bg-[#cccccc]';
  if (rating < 1400) return 'bg-[#77ff77]';
  if (rating < 1600) return 'bg-[#77ddbb]';
  if (rating < 1900) return 'bg-[#aaaaff]';
  if (rating < 2100) return 'bg-[#ff88ff]';
  if (rating < 2300) return 'bg-[#ffcc88]';
  if (rating < 2400) return 'bg-[#ffbb55]';
  if (rating < 2600) return 'bg-[#ff7777]';
  if (rating < 3000) return 'bg-[#ff3333]';
  return 'bg-[#aa0000]';
};

const getVerdictIcon = (verdict: string) => {
  switch (verdict) {
    case 'OK':
      return <CheckCircle2 className="w-4 h-4 text-[#238636]" />;
    case 'WRONG_ANSWER':
      return <XCircle className="w-4 h-4 text-[#da3633]" />;
    case 'TIME_LIMIT_EXCEEDED':
      return <Timer className="w-4 h-4 text-[#d29922]" />;
    case 'MEMORY_LIMIT_EXCEEDED':
      return <Cpu className="w-4 h-4 text-[#8957e5]" />;
    case 'RUNTIME_ERROR':
      return <AlertCircle className="w-4 h-4 text-[#f778ba]" />;
    default:
      return <MoreHorizontal className="w-4 h-4 text-[#6e7681]" />;
  }
};

const formatDate = (timestamp?: number): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Custom hook for resizable sidebar
function useResizableSidebar(minWidth: number = 260, maxWidth: number = 500, defaultWidth: number = 300) {
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

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth = e.clientX;
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing, minWidth, maxWidth]
  );

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
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing, resize, stopResizing]);

  return { sidebarWidth, sidebarRef, startResizing, isResizing };
}

// Dual Handle Range Slider with proper interaction
interface DualRangeSliderProps {
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}

function DualRangeSlider({ min, max, step, valueMin, valueMax, onChangeMin, onChangeMax }: DualRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);

  const minPercent = ((valueMin - min) / (max - min)) * 100;
  const maxPercent = ((valueMax - min) / (max - min)) * 100;

  const handleMouseDown = (handle: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(handle);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const value = Math.round((min + percent * (max - min)) / step) * step;
      
      if (dragging === 'min') {
        onChangeMin(Math.max(min, Math.min(value, valueMax - step)));
      } else {
        onChangeMax(Math.min(max, Math.max(value, valueMin + step)));
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [dragging, min, max, step, valueMin, valueMax, onChangeMin, onChangeMax]);

  return (
    <div className="space-y-3">
      {/* Slider Track */}
      <div ref={trackRef} className="relative h-2 bg-cf-border rounded-full cursor-pointer">
        {/* Active Range */}
        <div
          className="absolute h-full bg-cf-accent rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />
        
        {/* Min Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-cf-accent rounded-full border-2 border-white shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
          style={{ left: `calc(${minPercent}% - 10px)` }}
          onMouseDown={handleMouseDown('min')}
          title="Drag to adjust minimum"
        />
        
        {/* Max Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-cf-accent rounded-full border-2 border-white shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
          style={{ left: `calc(${maxPercent}% - 10px)` }}
          onMouseDown={handleMouseDown('max')}
          title="Drag to adjust maximum"
        />
      </div>

      {/* Input Fields */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-cf-muted mb-1 block">Min</label>
          <input
            type="number"
            value={valueMin}
            onChange={(e) => onChangeMin(Math.max(min, Math.min(parseInt(e.target.value) || min, valueMax - step)))}
            className="w-full px-2 py-1.5 bg-cf-bg border border-cf-border rounded text-sm text-center focus:border-cf-accent focus:outline-none"
          />
        </div>
        <span className="text-cf-muted pt-5">-</span>
        <div className="flex-1">
          <label className="text-xs text-cf-muted mb-1 block">Max</label>
          <input
            type="number"
            value={valueMax}
            onChange={(e) => onChangeMax(Math.min(max, Math.max(parseInt(e.target.value) || max, valueMin + step)))}
            className="w-full px-2 py-1.5 bg-cf-bg border border-cf-border rounded text-sm text-center focus:border-cf-accent focus:outline-none"
          />
        </div>
      </div>
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['divisions', 'indices', 'rating', 'solved', 'years', 'tags', 'status', 'users']));
  
  // Resizable sidebar
  const { sidebarWidth, sidebarRef, startResizing, isResizing } = useResizableSidebar(260, 500, 300);
  
  // Filters
  const [filters, setFilters] = useState<Filters>({
    divisions: [],
    indices: [],
    ratingMin: MIN_RATING,
    ratingMax: MAX_RATING,
    solvedMin: MIN_SOLVED,
    solvedMax: MAX_SOLVED,
    yearMin: 2010,
    yearMax: new Date().getFullYear(),
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
    if (savedBookmarks) {
      setBookmarks(new Set(JSON.parse(savedBookmarks)));
    }
    
    const savedFilters = localStorage.getItem('cf-filters');
    if (savedFilters) {
      const parsed = JSON.parse(savedFilters);
      setFilters({
        ...parsed,
        yearMin: parsed.yearMin || 2010,
        yearMax: parsed.yearMax || new Date().getFullYear(),
      });
    }
    
    const savedUsers = localStorage.getItem('cf-users');
    if (savedUsers) {
      const users = JSON.parse(savedUsers);
      setTrackedUsers(users.map((u: any) => ({
        ...u,
        submissions: new Map(Object.entries(u.submissions))
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
      submissions: Object.fromEntries(u.submissions)
    }));
    localStorage.setItem('cf-users', JSON.stringify(usersToSave));
  }, [trackedUsers]);

  // Fetch problems
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const problemsRes = await axios.get('https://codeforces.com/api/problemset.problems');
        const problemData = problemsRes.data.result.problems;
        
        const statsRes = await axios.get('https://codeforces.com/api/problemset.problems');
        const problemStats = statsRes.data.result.problemStatistics;
        
        const statsMap = new Map();
        problemStats.forEach((stat: any) => {
          const key = `${stat.contestId}-${stat.index}`;
          statsMap.set(key, stat.solvedCount);
        });
        
        const contestsRes = await axios.get('https://codeforces.com/api/contest.list');
        const contests = contestsRes.data.result;
        
        const contestMap = new Map();
        contests.forEach((contest: any) => {
          contestMap.set(contest.id, {
            name: contest.name,
            startTimeSeconds: contest.startTimeSeconds,
          });
        });
        
        const enrichedProblems: Problem[] = problemData.map((p: any) => {
          const contest = contestMap.get(p.contestId);
          const key = `${p.contestId}-${p.index}`;
          
          return {
            ...p,
            solvedCount: statsMap.get(key) || 0,
            contestName: contest?.name || 'Unknown Contest',
            contestStartTimeSeconds: contest?.startTimeSeconds,
            category: getCategoryFromContestName(contest?.name || ''),
          };
        });
        
        enrichedProblems.sort((a, b) => 
          (b.contestStartTimeSeconds || 0) - (a.contestStartTimeSeconds || 0)
        );
        
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

  // Apply filters
  useEffect(() => {
    let result = [...problems];
    
    if (filters.divisions.length > 0) {
      result = result.filter(p => filters.divisions.includes(p.category));
    }
    
    if (filters.indices.length > 0) {
      result = result.filter(p => filters.indices.includes(p.index[0]));
    }
    
    // Rating range filter
    result = result.filter(p => {
      const rating = p.rating || 0;
      return rating >= filters.ratingMin && rating <= filters.ratingMax;
    });
    
    // Solved count range filter
    result = result.filter(p => 
      p.solvedCount >= filters.solvedMin && p.solvedCount <= filters.solvedMax
    );
    
    // Year range filter
    result = result.filter(p => {
      if (!p.contestStartTimeSeconds) return false;
      const year = new Date(p.contestStartTimeSeconds * 1000).getFullYear();
      return year >= filters.yearMin && year <= filters.yearMax;
    });
    
    if (filters.tags.length > 0) {
      result = result.filter(p => {
        if (filters.tagMode === 'AND') {
          return filters.tags.every(tag => p.tags.includes(tag));
        } else {
          return filters.tags.some(tag => p.tags.includes(tag));
        }
      });
    }
    
    if (filters.status !== 'all' && trackedUsers.length > 0) {
      result = result.filter(p => {
        const key = `${p.contestId}-${p.index}`;
        const isSolved = trackedUsers.some(u => u.submissions.get(key) === 'OK');
        return filters.status === 'solved' ? isSolved : !isSolved;
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
        case 'date':
          comparison = (a.contestStartTimeSeconds || 0) - (b.contestStartTimeSeconds || 0);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'solved':
          comparison = a.solvedCount - b.solvedCount;
          break;
        case 'id':
          comparison = a.contestId - b.contestId;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredProblems(result);
    setCurrentPage(1);
  }, [problems, filters, sortField, sortDirection, trackedUsers]);

  // Add user
  const addUser = async () => {
    if (!newHandle.trim()) return;
    if (trackedUsers.length >= 7) {
      alert('Maximum 7 users can be tracked');
      return;
    }
    
    setUserLoading(true);
    try {
      const res = await axios.get(`https://codeforces.com/api/user.status?handle=${newHandle.trim()}`);
      const submissions = res.data.result;
      
      const submissionMap = new Map<string, string>();
      submissions.forEach((sub: any) => {
        const key = `${sub.contestId}-${sub.problem.index}`;
        if (!submissionMap.has(key) || sub.verdict === 'OK') {
          submissionMap.set(key, sub.verdict);
        }
      });
      
      const newUser: TrackedUser = {
        handle: newHandle.trim(),
        color: USER_COLORS[trackedUsers.length % USER_COLORS.length],
        submissions: submissionMap,
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
    if (newBookmarks.has(problemId)) {
      newBookmarks.delete(problemId);
    } else {
      newBookmarks.add(problemId);
    }
    setBookmarks(newBookmarks);
  };

  // Toggle section
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      divisions: [],
      indices: [],
      ratingMin: MIN_RATING,
      ratingMax: MAX_RATING,
      solvedMin: MIN_SOLVED,
      solvedMax: MAX_SOLVED,
      yearMin: 2010,
      yearMax: new Date().getFullYear(),
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
    if (filters.indices.length > 0) count++;
    if (filters.ratingMin > MIN_RATING || filters.ratingMax < MAX_RATING) count++;
    if (filters.solvedMin > MIN_SOLVED || filters.solvedMax < MAX_SOLVED) count++;
    if (filters.yearMin > 2010 || filters.yearMax < new Date().getFullYear()) count++;
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

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    problems.forEach(p => {
      if (p.contestStartTimeSeconds) {
        years.add(new Date(p.contestStartTimeSeconds * 1000).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [problems]);

  const minAvailableYear = availableYears.length > 0 ? Math.min(...availableYears) : 2010;
  const maxAvailableYear = availableYears.length > 0 ? Math.max(...availableYears) : new Date().getFullYear();

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Index', 'Name', 'Rating', 'Solved', 'Category', 'Date', 'Tags'];
    const rows = filteredProblems.map(p => [
      p.contestId,
      p.index,
      p.name,
      p.rating || 'Unrated',
      p.solvedCount,
      p.category,
      formatDate(p.contestStartTimeSeconds),
      p.tags.join('; '),
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
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cf-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-cf-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-cf-muted">Loading problems...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cf-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-cf-accent text-white rounded hover:bg-blue-500 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cf-bg flex flex-col">
      {/* Navbar */}
      <nav className="h-14 bg-cf-card border-b border-cf-border flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-cf-hover rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex p-2 hover:bg-cf-hover rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
              CF
            </div>
            <span className="font-semibold text-lg hidden sm:inline">Filter</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <a 
            href="https://codeforces.com/problemset" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm text-cf-muted hover:text-cf-text hover:bg-cf-hover rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Problemset
          </a>
          <a 
            href="https://codeforces.com/contests" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm text-cf-muted hover:text-cf-text hover:bg-cf-hover rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Contests
          </a>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-cf-accent hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside 
          ref={sidebarRef}
          style={{ width: sidebarOpen ? sidebarWidth : 0 }}
          className={`
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0
            ${sidebarOpen ? 'md:block' : 'hidden'}
            fixed md:relative
            top-14 md:top-0
            left-0
            h-[calc(100vh-56px)] md:h-auto
            bg-cf-card border-r border-cf-border
            overflow-hidden
            z-50 md:z-auto
            transition-transform duration-300 flex-shrink-0
          `}
        >
          {/* Scrollable Content */}
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {/* Active Filters */}
            {activeFilterCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-cf-muted">{activeFilterCount} filter(s) active</span>
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cf-muted" />
              <input
                type="text"
                placeholder="Search problems..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-cf-bg border border-cf-border rounded-lg text-sm focus:border-cf-accent focus:outline-none transition-colors"
              />
            </div>

            {/* Track Users */}
            <div className="border border-cf-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('users')}
                className="w-full px-4 py-3 flex items-center justify-between bg-cf-bg hover:bg-cf-hover transition-colors"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-cf-accent" />
                  <span className="font-medium">Track Users</span>
                </div>
                {expandedSections.has('users') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.has('users') && (
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter handle"
                      value={newHandle}
                      onChange={(e) => setNewHandle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addUser()}
                      className="flex-1 px-3 py-2 bg-cf-bg border border-cf-border rounded-lg text-sm focus:border-cf-accent focus:outline-none"
                    />
                    <button
                      onClick={addUser}
                      disabled={userLoading}
                      className="px-3 py-2 bg-cf-accent hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {userLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {trackedUsers.length > 0 && (
                    <div className="space-y-2">
                      {trackedUsers.map((user) => (
                        <div key={user.handle} className="flex items-center justify-between p-2 bg-cf-bg rounded-lg">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: user.color }}
                            />
                            <span className="text-sm font-medium">{user.handle}</span>
                          </div>
                          <button
                            onClick={() => removeUser(user.handle)}
                            className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Division Filter */}
            <div className="border border-cf-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('divisions')}
                className="w-full px-4 py-3 flex items-center justify-between bg-cf-bg hover:bg-cf-hover transition-colors"
              >
                <span className="font-medium">Division</span>
                <div className="flex items-center gap-2">
                  {filters.divisions.length > 0 && (
                    <span className="px-2 py-0.5 bg-cf-accent text-white text-xs rounded-full">
                      {filters.divisions.length}
                    </span>
                  )}
                  {expandedSections.has('divisions') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {expandedSections.has('divisions') && (
                <div className="p-3 grid grid-cols-2 gap-2">
                  {DIVISIONS.map((div) => (
                    <button
                      key={div.id}
                      onClick={() => {
                        const newDivs = filters.divisions.includes(div.id)
                          ? filters.divisions.filter(d => d !== div.id)
                          : [...filters.divisions, div.id];
                        setFilters({ ...filters, divisions: newDivs });
                      }}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        filters.divisions.includes(div.id)
                          ? 'bg-cf-accent border-cf-accent text-white'
                          : 'bg-cf-bg border-cf-border hover:border-cf-muted'
                      }`}
                    >
                      {div.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Problem Index Filter */}
            <div className="border border-cf-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('indices')}
                className="w-full px-4 py-3 flex items-center justify-between bg-cf-bg hover:bg-cf-hover transition-colors"
              >
                <span className="font-medium">Problem Index</span>
                <div className="flex items-center gap-2">
                  {filters.indices.length > 0 && (
                    <span className="px-2 py-0.5 bg-cf-accent text-white text-xs rounded-full">
                      {filters.indices.length}
                    </span>
                  )}
                  {expandedSections.has('indices') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {expandedSections.has('indices') && (
                <div className="p-3 grid grid-cols-4 gap-2">
                  {INDICES.map((idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const newIndices = filters.indices.includes(idx)
                          ? filters.indices.filter(i => i !== idx)
                          : [...filters.indices, idx];
                        setFilters({ ...filters, indices: newIndices });
                      }}
                      className={`px-2 py-2 text-sm rounded-lg border transition-all ${
                        filters.indices.includes(idx)
                          ? 'bg-cf-accent border-cf-accent text-white'
                          : 'bg-cf-bg border-cf-border hover:border-cf-muted'
                      }`}
                    >
                      {idx}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rating Range Filter with Slider */}
            <div className="border border-cf-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('rating')}
                className="w-full px-4 py-3 flex items-center justify-between bg-cf-bg hover:bg-cf-hover transition-colors"
              >
                <span className="font-medium">Rating Range</span>
                {(filters.ratingMin > MIN_RATING || filters.ratingMax < MAX_RATING) && (
                  <span className="px-2 py-0.5 bg-cf-accent text-white text-xs rounded-full">
                    {filters.ratingMin}-{filters.ratingMax}
                  </span>
                )}
                {expandedSections.has('rating') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.has('rating') && (
                <div className="p-4 space-y-4">
                  <DualRangeSlider
                    min={MIN_RATING}
                    max={MAX_RATING}
                    step={RATING_STEP}
                    valueMin={filters.ratingMin}
                    valueMax={filters.ratingMax}
                    onChangeMin={(v: number) => setFilters({ ...filters, ratingMin: v })}
                    onChangeMax={(v: number) => setFilters({ ...filters, ratingMax: v })}
                  />
                </div>
              )}
            </div>

            {/* Solved Count Range Filter with Slider */}
            <div className="border border-cf-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('solved')}
                className="w-full px-4 py-3 flex items-center justify-between bg-cf-bg hover:bg-cf-hover transition-colors"
              >
                <span className="font-medium">Solved Count Range</span>
                {(filters.solvedMin > MIN_SOLVED || filters.solvedMax < MAX_SOLVED) && (
                  <span className="px-2 py-0.5 bg-cf-accent text-white text-xs rounded-full">
                    {formatNumber(filters.solvedMin)}-{formatNumber(filters.solvedMax)}
                  </span>
                )}
                {expandedSections.has('solved') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.has('solved') && (
                <div className="p-4 space-y-4">
                  <DualRangeSlider
                    min={MIN_SOLVED}
                    max={MAX_SOLVED}
                    step={SOLVED_STEP}
                    valueMin={filters.solvedMin}
                    valueMax={filters.solvedMax}
                    onChangeMin={(v: number) => setFilters({ ...filters, solvedMin: v })}
                    onChangeMax={(v: number) => setFilters({ ...filters, solvedMax: v })}
                  />
                </div>
              )}
            </div>

            {/* Year Range Filter with Slider */}
            <div className="border border-cf-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('years')}
                className="w-full px-4 py-3 flex items-center justify-between bg-cf-bg hover:bg-cf-hover transition-colors"
              >
                <span className="font-medium">Year Range</span>
                {(filters.yearMin > minAvailableYear || filters.yearMax < maxAvailableYear) && (
                  <span className="px-2 py-0.5 bg-cf-accent text-white text-xs rounded-full">
                    {filters.yearMin}-{filters.yearMax}
                  </span>
                )}
                {expandedSections.has('years') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.has('years') && (
                <div className="p-4 space-y-4">
                  <DualRangeSlider
                    min={minAvailableYear}
                    max={maxAvailableYear}
                    step={1}
                    valueMin={filters.yearMin}
                    valueMax={filters.yearMax}
                    onChangeMin={(v: number) => setFilters({ ...filters, yearMin: v })}
                    onChangeMax={(v: number) => setFilters({ ...filters, yearMax: v })}
                  />
                </div>
              )}
            </div>

            {/* Tags Filter */}
            <div className="border border-cf-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('tags')}
                className="w-full px-4 py-3 flex items-center justify-between bg-cf-bg hover:bg-cf-hover transition-colors"
              >
                <span className="font-medium">Tags</span>
                <div className="flex items-center gap-2">
                  {filters.tags.length > 0 && (
                    <span className="px-2 py-0.5 bg-cf-accent text-white text-xs rounded-full">
                      {filters.tags.length}
                    </span>
                  )}
                  {expandedSections.has('tags') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {expandedSections.has('tags') && (
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilters({ ...filters, tagMode: 'OR' })}
                      className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
                        filters.tagMode === 'OR'
                          ? 'bg-cf-accent border-cf-accent text-white'
                          : 'bg-cf-bg border-cf-border hover:border-cf-muted'
                      }`}
                    >
                      OR
                    </button>
                    <button
                      onClick={() => setFilters({ ...filters, tagMode: 'AND' })}
                      className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
                        filters.tagMode === 'AND'
                          ? 'bg-cf-accent border-cf-accent text-white'
                          : 'bg-cf-bg border-cf-border hover:border-cf-muted'
                      }`}
                    >
                      AND
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {ALL_TAGS.map((tag) => (
                      <label
                        key={tag}
                        className="flex items-center gap-2 p-2 hover:bg-cf-hover rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filters.tags.includes(tag)}
                          onChange={() => {
                            const newTags = filters.tags.includes(tag)
                              ? filters.tags.filter(t => t !== tag)
                              : [...filters.tags, tag];
                            setFilters({ ...filters, tags: newTags });
                          }}
                          className="custom-checkbox"
                        />
                        <span className="text-sm">{tag}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="border border-cf-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('status')}
                className="w-full px-4 py-3 flex items-center justify-between bg-cf-bg hover:bg-cf-hover transition-colors"
              >
                <span className="font-medium">Status</span>
                {filters.status !== 'all' && (
                  <span className="px-2 py-0.5 bg-cf-accent text-white text-xs rounded-full capitalize">
                    {filters.status}
                  </span>
                )}
                {expandedSections.has('status') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.has('status') && (
                <div className="p-3 space-y-2">
                  {['all', 'solved', 'unsolved'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilters({ ...filters, status: status as any })}
                      className={`w-full px-3 py-2 text-sm rounded-lg border transition-all capitalize ${
                        filters.status === status
                          ? 'bg-cf-accent border-cf-accent text-white'
                          : 'bg-cf-bg border-cf-border hover:border-cf-muted'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Resize Handle */}
          <div
            onMouseDown={startResizing}
            className={`
              absolute top-0 right-0 w-1 h-full cursor-col-resize
              hover:bg-cf-accent/50 active:bg-cf-accent
              transition-colors z-10
              ${isResizing ? 'bg-cf-accent' : 'bg-transparent'}
            `}
            title="Drag to resize sidebar"
          >
            <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-8 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3 text-cf-muted" />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Toolbar */}
          <div className="h-14 border-b border-cf-border flex items-center justify-between px-4 bg-cf-card">
            <div className="flex items-center gap-4">
              <span className="text-sm text-cf-muted">
                Showing <span className="text-cf-text font-medium">{Math.min((currentPage - 1) * pageSize + 1, filteredProblems.length)}-{Math.min(currentPage * pageSize, filteredProblems.length)}</span> of <span className="text-cf-text font-medium">{filteredProblems.length.toLocaleString()}</span> problems
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-cf-bg border border-cf-border rounded-lg text-sm focus:border-cf-accent focus:outline-none"
              >
                <option value={10}>10/page</option>
                <option value={25}>25/page</option>
                <option value={50}>50/page</option>
                <option value={100}>100/page</option>
              </select>
            </div>
          </div>

          {/* Problem Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full problem-table">
              <thead>
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs font-medium text-cf-muted uppercase tracking-wider w-10">#</th>
                  <th className="px-4 py-3 text-xs font-medium text-cf-muted uppercase tracking-wider w-16">Idx</th>
                  <th className="px-4 py-3 text-xs font-medium text-cf-muted uppercase tracking-wider">Problem</th>
                  <th 
                    className="px-4 py-3 text-xs font-medium text-cf-muted uppercase tracking-wider cursor-pointer hover:text-cf-text transition-colors"
                    onClick={() => {
                      if (sortField === 'rating') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('rating');
                        setSortDirection('desc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Rating
                      {sortField === 'rating' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-xs font-medium text-cf-muted uppercase tracking-wider cursor-pointer hover:text-cf-text transition-colors"
                    onClick={() => {
                      if (sortField === 'solved') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('solved');
                        setSortDirection('desc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Solved
                      {sortField === 'solved' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-cf-muted uppercase tracking-wider hide-mobile">Category</th>
                  <th 
                    className="px-4 py-3 text-xs font-medium text-cf-muted uppercase tracking-wider cursor-pointer hover:text-cf-text transition-colors hide-mobile"
                    onClick={() => {
                      if (sortField === 'date') {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField('date');
                        setSortDirection('desc');
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {sortField === 'date' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-cf-muted uppercase tracking-wider hide-mobile">Tags</th>
                  {trackedUsers.length > 0 && (
                    <th className="px-4 py-3 text-xs font-medium text-cf-muted uppercase tracking-wider">Users</th>
                  )}
                  <th className="px-4 py-3 text-xs font-medium text-cf-muted uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProblems.map((problem) => {
                  const problemId = `${problem.contestId}-${problem.index}`;
                  const isBookmarked = bookmarks.has(problemId);
                  
                  return (
                    <tr key={problemId} className="group">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleBookmark(problemId)}
                          className={`transition-colors ${isBookmarked ? 'text-yellow-400' : 'text-cf-muted hover:text-yellow-400'}`}
                        >
                          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-cf-muted">{problem.index}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {trackedUsers.length > 0 && (
                            (() => {
                              const key = `${problem.contestId}-${problem.index}`;
                              const solvedUser = trackedUsers.find(u => u.submissions.get(key) === 'OK');
                              const attemptedUser = trackedUsers.find(u => {
                                const verdict = u.submissions.get(key);
                                return verdict && verdict !== 'OK';
                              });
                              
                              if (solvedUser) {
                                return <CheckCircle2 className="w-4 h-4 text-[#238636] flex-shrink-0" />;
                              } else if (attemptedUser) {
                                const verdict = attemptedUser.submissions.get(key) || '';
                                return <span className="flex-shrink-0">{getVerdictIcon(verdict)}</span>;
                              }
                              return <div className="w-4 h-4 flex-shrink-0" />;
                            })()
                          )}
                          
                          <a
                            href={`https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:text-cf-accent transition-colors line-clamp-1"
                          >
                            {problem.name}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {problem.rating ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRatingBgColor(problem.rating)} text-black`}>
                            {problem.rating}
                          </span>
                        ) : (
                          <span className="text-cf-muted text-sm">Unrated</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-cf-muted">{formatNumber(problem.solvedCount)}</span>
                      </td>
                      <td className="px-4 py-3 hide-mobile">
                        <span className="text-xs px-2 py-1 bg-cf-bg rounded text-cf-muted">{problem.category}</span>
                      </td>
                      <td className="px-4 py-3 hide-mobile">
                        <span className="text-sm text-cf-muted">{formatDate(problem.contestStartTimeSeconds)}</span>
                      </td>
                      <td className="px-4 py-3 hide-mobile">
                        <div className="flex flex-wrap gap-1">
                          {problem.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs px-2 py-0.5 bg-cf-bg rounded text-cf-muted">
                              {tag}
                            </span>
                          ))}
                          {problem.tags.length > 2 && (
                            <span className="text-xs px-2 py-0.5 bg-cf-bg rounded text-cf-muted">
                              +{problem.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      {trackedUsers.length > 0 && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {trackedUsers.map((user) => {
                              const key = `${problem.contestId}-${problem.index}`;
                              const verdict = user.submissions.get(key);
                              if (!verdict) return null;
                              
                              return (
                                <div
                                  key={user.handle}
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black"
                                  style={{ backgroundColor: user.color }}
                                  title={`${user.handle}: ${verdict}`}
                                >
                                  {user.handle[0].toUpperCase()}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <a
                            href={`https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-cf-hover rounded-lg text-cf-muted hover:text-cf-text transition-colors"
                            title="Open problem"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-cf-hover rounded-lg text-cf-muted hover:text-cf-text transition-colors"
                            title="View problem"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {paginatedProblems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <Filter className="w-12 h-12 text-cf-muted mb-4" />
                <p className="text-cf-muted">No problems match your filters</p>
                <button
                  onClick={clearAllFilters}
                  className="mt-4 px-4 py-2 bg-cf-accent hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="h-14 border-t border-cf-border flex items-center justify-center gap-2 px-4 bg-cf-card">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-cf-hover rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-cf-accent text-white'
                        : 'hover:bg-cf-hover text-cf-muted'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-cf-hover rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="h-10 bg-cf-card border-t border-cf-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4 text-xs text-cf-muted">
          <span>CF Filter</span>
          <span>Powered by Codeforces API</span>
        </div>
        <div className="flex items-center gap-3">
          <a 
            href="https://codeforces.com/profile/m0stafa" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-cf-muted hover:text-cf-text transition-colors"
          >
            @m0stafa
          </a>
        </div>
      </footer>
    </div>
  );
}
