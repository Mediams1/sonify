import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Search, 
  Library, 
  PlusSquare, 
  Heart, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Shuffle, 
  Volume2, 
  User as UserIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MoreHorizontal,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Song, User, GENRES } from './types.ts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library'>('home');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize data
  useEffect(() => {
    fetchSongs();
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const fetchSongs = async (query?: string, genre?: string) => {
    const params = new URLSearchParams();
    if (query) params.append('term', query);
    if (genre) params.append('genre', genre);
    
    try {
      const resp = await fetch(`/api/songs/search?${params.toString()}`);
      const data = await resp.json();
      setSongs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlaySong = (song: Song) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
      setRecentSongs(prev => [song, ...prev.slice(0, 4)]);
    }
  };

  // Recommendation logic
  useEffect(() => {
    if (currentTime >= duration && duration > 0) {
      handleNext();
    }
  }, [currentTime, duration]);

  const handleNext = async () => {
    if (recentSongs.length > 0) {
      try {
        const prompt = `Act as a music recommendation system. Based on these recently played Latin songs: ${JSON.stringify(recentSongs.map(s => s.title))} and this user taste profile: 'Latin music lover', suggest ONE Latin music genre from this list: ${GENRES.join(', ')} that would be perfect to play next. Respond ONLY with the name of the genre.`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });

        const genre = response.text?.trim() || 'Reggaeton';
        
        const songsResp = await fetch(`/api/songs/search?genre=${genre}`);
        const recommendedSongs = await songsResp.json();
        if (recommendedSongs.length > 0) {
          const next = recommendedSongs[Math.floor(Math.random() * recommendedSongs.length)];
          handlePlaySong(next);
        }
      } catch (e) {
        console.error("AI recommendation failed, picking random", e);
      }
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Audio effects
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play();
      else audioRef.current.pause();
    }
  }, [isPlaying, currentSong]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-screen w-full bg-black text-white font-sans overflow-hidden">
      <div className="atmosphere-bg" />
      
      {/* Sidebar */}
      <aside className="w-64 bg-black flex flex-col p-6 gap-6 border-r border-zinc-900 z-10 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-[#1DB954] rounded-full flex items-center justify-center">
             <Play fill="black" size={16} />
          </div>
          <span className="text-xl font-bold tracking-tight">Sonify</span>
        </div>

        <nav className="space-y-4">
          <SidebarItem icon={<Home size={24} />} label="Inicio" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <SidebarItem icon={<Search size={24} />} label="Buscar" active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
          <SidebarItem icon={<Library size={24} />} label="Tu Biblioteca" active={activeTab === 'library'} onClick={() => setActiveTab('library')} />
        </nav>

        <div className="space-y-4 pt-4 border-t border-zinc-900">
           <SidebarItem icon={<PlusSquare size={24} />} label="Crear Playlist" />
           <SidebarItem icon={<Heart size={24} className="text-pink-500" />} label="Tus Me Gusta" />
        </div>

        <div className="mt-auto">
          {user && !user.is_verified ? (
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Estado de cuenta</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                <span className="text-xs font-medium text-zinc-300">Pendiente de verificar</span>
              </div>
              <button 
                onClick={() => alert('Simulación: Revisa los logs para el link de verificación.')}
                className="w-full py-2 bg-white text-black text-xs font-bold rounded-full hover:scale-105 transition-transform"
              >
                Verificar Email
              </button>
            </div>
          ) : !user ? (
            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700">
              <p className="text-sm font-bold mb-2">Crea tu cuenta</p>
              <p className="text-xs text-zinc-400 mb-4 font-medium italic">Accede a recomendaciones IA personalizadas.</p>
              <button 
                onClick={() => setShowAuthModal(true)}
                className="w-full py-2 bg-[#1DB954] text-black text-xs font-bold rounded-full hover:scale-105 transition-transform"
              >
                Registrarme
              </button>
            </div>
          ) : (
             <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center font-bold text-xs">
                      {user.username.charAt(0).toUpperCase()}
                   </div>
                   <div className="flex flex-col">
                      <span className="text-xs font-bold truncate w-24">{user.username}</span>
                      <span className="text-[10px] text-green-500 flex items-center gap-1 font-bold"><ShieldCheck size={10} /> Cuenta PRO</span>
                   </div>
                </div>
                <button onClick={handleLogout} className="text-zinc-500 hover:text-white"><LogOut size={14} /></button>
             </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-gradient-to-b from-zinc-900 to-black relative overflow-hidden">
        <header className="h-16 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md z-20 transition-all duration-300 border-b border-white/5">
          <div className="flex gap-4">
            <button className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"><ChevronLeft size={20} /></button>
            <button className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"><ChevronRight size={20} /></button>
          </div>
          
          <div className="flex items-center gap-4">
            {user?.is_verified && <span className="text-[10px] font-black px-3 py-1 bg-[#1DB954] text-black rounded-full tracking-widest uppercase">Verified Mode</span>}
             {!user && (
               <button 
                 onClick={() => setShowAuthModal(true)}
                 className="text-sm font-bold text-zinc-400 hover:text-white transition-colors"
               >
                 Log in
               </button>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 pb-32">
          {activeTab === 'home' && (
            <>
              <section>
                <h2 className="text-2xl font-bold mb-6 italic font-serif">Géneros latinos destacados</h2>
                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                  {GENRES.map(g => (
                    <GenreCard 
                       key={g} 
                       genre={g} 
                       active={currentSong?.genre === g}
                       onClick={async () => { await fetchSongs(undefined, g); }} 
                    />
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold tracking-tight">Escuchado recientemente</h2>
                  <button className="text-zinc-500 font-bold text-xs tracking-widest uppercase hover:text-white transition-colors">Ver todo</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {songs.map(s => (
                    <SongCard 
                      key={s.id} 
                      song={s} 
                      isActive={currentSong?.id === s.id}
                      isPlaying={isPlaying && currentSong?.id === s.id}
                      onClick={() => handlePlaySong(s)} 
                    />
                  ))}
                </div>
              </section>
              
              {recentSongs.length > 0 && (
                <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800/50 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                       <ExternalLink size={20} className="text-blue-400" />
                    </div>
                    <div>
                       <p className="text-sm font-bold">Smart Queue Activa</p>
                       <p className="text-xs text-zinc-500 font-medium tracking-tight">IA analizando tu sesión basada en {recentSongs.length} temas.</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700/50 group-hover:border-blue-500/30 transition-colors">
                    Next up: Gemini Choice
                  </span>
                </div>
              )}
            </>
          )}

          {activeTab === 'search' && (
            <div className="space-y-8">
              <div className="max-w-md relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={20} />
                <input 
                  autoFocus
                  placeholder="Artistas, canciones o géneros"
                  className="w-full bg-zinc-800/50 hover:bg-zinc-800 focus:bg-zinc-800 rounded-full py-4 pl-12 pr-4 outline-none transition-all border border-transparent focus:border-zinc-700 text-sm font-medium"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchSongs(e.target.value);
                  }}
                />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-6">Explorar por categoría</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {GENRES.map(g => (
                    <div 
                      key={g} 
                      onClick={() => fetchSongs(undefined, g)}
                      className="aspect-[16/9] rounded-xl p-4 font-black text-lg cursor-pointer hover:scale-[1.02] transition-all overflow-hidden relative group border border-white/5"
                      style={{ backgroundColor: `hsl(${Math.random() * 360}, 40%, 25%)` }}
                    >
                      <span className="relative z-10">{g}</span>
                      <img src={`https://picsum.photos/seed/${g}/300/200`} className="absolute -right-2 -bottom-2 w-32 h-32 rotate-12 shadow-2xl group-hover:scale-110 transition-transform brightness-75" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Player Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-24 bg-black border-t border-zinc-900 px-6 flex items-center justify-between z-50">
        {/* Left: Current Song */}
        <div className="flex items-center gap-4 w-1/4 min-w-0">
          {currentSong ? (
            <>
              <div className="relative group">
                <img src={currentSong.artwork_url} className="w-14 h-14 rounded shadow-2xl object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <PlusSquare size={16} />
                </div>
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate hover:underline cursor-pointer">{currentSong.title}</div>
                <div className="text-xs text-zinc-400 truncate hover:underline cursor-pointer hover:text-white">{currentSong.artist}</div>
              </div>
              <button className="text-zinc-500 hover:text-[#1DB954] transition-colors"><Heart size={18} /></button>
            </>
          ) : (
            <div className="text-zinc-600 text-xs font-bold tracking-widest uppercase italic">No playback selected</div>
          )}
        </div>

        {/* Center: Controls */}
        <div className="flex flex-col items-center flex-1 max-w-2xl px-8">
          <div className="flex items-center gap-6 mb-2">
            <button className="text-zinc-500 hover:text-white transition-colors"><Shuffle size={16} /></button>
            <button className="text-zinc-400 hover:text-white transition-colors transform active:scale-95"><SkipBack size={24} fill="currentColor" /></button>
            <button 
              onClick={() => currentSong && setIsPlaying(!isPlaying)}
              disabled={!currentSong}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-30 shadow-xl"
            >
              {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
            </button>
            <button onClick={handleNext} className="text-zinc-400 hover:text-white transition-colors transform active:scale-95"><SkipForward size={24} fill="currentColor" /></button>
            <button className="text-zinc-500 hover:text-white transition-colors"><Repeat size={16} /></button>
          </div>
          <div className="flex items-center gap-3 w-full">
            <span className="text-[10px] text-zinc-500 w-8 text-right font-mono font-bold">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 bg-zinc-800 rounded-full relative group cursor-pointer">
               <div 
                 className="h-full bg-white group-hover:bg-[#1DB954] rounded-full relative" 
                 style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
               >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-xl" />
               </div>
            </div>
            <span className="text-[10px] text-zinc-500 w-8 font-mono font-bold">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Sound */}
        <div className="flex items-center justify-end gap-4 w-1/4">
          <button className="text-zinc-500 hover:text-white"><MoreHorizontal size={20} /></button>
          <div className="flex items-center gap-2">
            <Volume2 size={18} className="text-zinc-500" />
            <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden relative group">
              <div 
                className="h-full bg-zinc-200 group-hover:bg-[#1DB954] rounded-full" 
                style={{ width: `${volume * 100}%` }}
              />
            </div>
          </div>
        </div>
      </footer>

      {currentSong && (
        <audio 
          ref={audioRef}
          key={currentSong.id}
          src={currentSong.preview_url} 
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={handleNext}
        />
      )}

      <AnimatePresence>
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
            onSuccess={(u) => {
              setUser(u);
              setToken(localStorage.getItem('token'));
              setShowAuthModal(false);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 cursor-pointer transition-colors font-bold text-sm",
        active ? "text-white" : "text-zinc-400 hover:text-white"
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function GenreCard({ genre, onClick, active }: { genre: string, onClick: () => Promise<void>, key?: any, active?: boolean }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex-shrink-0 px-6 py-2.5 rounded-lg text-sm transition-all cursor-pointer font-bold border",
        active 
          ? "bg-[#1DB954] text-black border-[#1DB954] shadow-lg shadow-green-500/20" 
          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white"
      )}
    >
      {genre}
    </div>
  );
}

function SongCard({ song, onClick, isActive, isPlaying }: { song: Song, onClick: () => void, isActive?: boolean, isPlaying?: boolean, key?: any }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-zinc-900/40 hover:bg-zinc-800/60 p-4 rounded-xl cursor-pointer transition-all group relative border border-transparent",
        isActive && "bg-zinc-800 border-zinc-700 shadow-2xl"
      )}
    >
      <div className="relative aspect-square mb-4 shadow-xl overflow-hidden rounded-lg">
        <img src={song.artwork_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
        <div className={cn(
          "absolute right-3 bottom-3 w-10 h-10 bg-[#1DB954] rounded-full shadow-2xl flex items-center justify-center transition-all transform",
          isPlaying ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
        )}>
          {isPlaying ? <Pause fill="black" size={20} /> : <Play fill="black" size={20} className="ml-1" />}
        </div>
      </div>
      <div className="font-bold truncate text-sm mb-1">{song.title}</div>
      <div className="text-[10px] uppercase font-black tracking-widest text-zinc-500 truncate">{song.artist}</div>
    </div>
  );
}

function AuthModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: (u: User) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onSuccess(data.user);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-black w-full max-w-md p-8 rounded-3xl border border-zinc-800 shadow-2xl space-y-6"
      >
        <div className="flex justify-center mb-4">
           <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center">
             <Play fill="black" size={24} />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-center tracking-tighter uppercase italic">
          {isLogin ? 'Sonify Login' : 'Sonify Signup'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Nombre de usuario</label>
              <input 
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 placeholder-zinc-700 outline-none hover:border-zinc-700 focus:border-[#1DB954] transition-colors text-sm"
                placeholder="RitmoLatinoUser"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Email</label>
            <input 
              required
              type="email"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 placeholder-zinc-700 outline-none hover:border-zinc-700 focus:border-[#1DB954] transition-colors text-sm"
              placeholder="hola@ritmo.lat"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Password</label>
            <input 
              required
              type="password"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 placeholder-zinc-700 outline-none hover:border-zinc-700 focus:border-[#1DB954] transition-colors text-sm"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl hover:scale-[1.02] active:scale-95 transition-all mt-4 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : (isLogin ? 'Enter' : 'Join Now')}
          </button>
        </form>

        <div className="text-center text-xs">
          <span className="text-zinc-500 uppercase font-bold">
            {isLogin ? 'No account yet?' : 'Already a member?'}
          </span>
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 font-black text-white hover:text-[#1DB954] underline decoration-[#1DB954]"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>

        <button 
          onClick={onClose}
          className="w-full text-zinc-600 text-[10px] uppercase font-black hover:text-white transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}
