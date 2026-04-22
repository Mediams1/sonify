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
  MoreHorizontal
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
      <nav className="w-64 bg-black flex flex-col p-6 space-y-8 z-10 shrink-0">
        <div className="flex items-center space-x-2 text-2xl font-bold text-white">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Play fill="black" size={16} />
          </div>
          <span>Sonify</span>
        </div>

        <div className="space-y-4">
          <SidebarItem icon={<Home size={24} />} label="Inicio" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <SidebarItem icon={<Search size={24} />} label="Buscar" active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
          <SidebarItem icon={<Library size={24} />} label="Tu Biblioteca" active={activeTab === 'library'} onClick={() => setActiveTab('library')} />
        </div>

        <div className="space-y-4 pt-4 border-t border-white/10">
          <SidebarItem icon={<PlusSquare size={24} />} label="Crear Playlist" />
          <SidebarItem icon={<Heart size={24} className="text-pink-500" />} label="Tus Me Gusta" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mt-4 text-sm text-gray-400">
          {['Mis Favoritos Latin', 'Vibe Reggaeton', 'Salsa para el Alma'].map(p => (
            <div key={p} className="hover:text-white cursor-pointer transition-colors py-1">{p}</div>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto bg-gradient-to-b from-blue-900/40 via-black to-black pb-24">
        <header className="sticky top-0 w-full p-4 flex items-center justify-between z-20 transition-all duration-300">
          <div className="flex items-center space-x-4">
            <button className="p-1 rounded-full bg-black/60"><ChevronLeft size={20} /></button>
            <button className="p-1 rounded-full bg-black/60"><ChevronRight size={20} /></button>
          </div>
          
          <div className="flex items-center space-x-4">
            {!user ? (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-white text-black font-bold py-2 px-8 rounded-full hover:scale-105 transition-transform"
              >
                Registrarse
              </button>
            ) : (
              <div className="flex items-center space-x-4 p-1 px-3 bg-black/60 rounded-full">
                <UserIcon size={20} />
                <span className="font-medium text-sm">{user.username}</span>
                {user.is_verified ? (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 flex items-center gap-1">
                    <ShieldCheck size={12} /> Verificado
                  </span>
                ) : (
                  <button 
                    onClick={() => alert(`Simulación: Revisa los logs del server para el link de verificación.`)}
                    className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30 font-mono"
                  >
                    No verificado
                  </button>
                )}
                <button onClick={handleLogout} className="text-gray-400 hover:text-white"><LogOut size={16} /></button>
              </div>
            )}
          </div>
        </header>

        <div className="p-8 space-y-8">
          {activeTab === 'home' && (
            <>
              <section>
                <h2 className="text-3xl font-bold mb-6">Buenos días</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {GENRES.slice(0, 6).map(g => (
                    <GenreCard key={g} genre={g} onClick={async () => { await fetchSongs(undefined, g); }} />
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Escuchado recientemente</h2>
                  <button className="text-gray-400 font-bold text-sm tracking-tight hover:underline">Ver todo</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
            </>
          )}

          {activeTab === 'search' && (
            <div className="space-y-8">
              <div className="max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  autoFocus
                  placeholder="¿Qué quieres escuchar?"
                  className="w-full bg-white/10 hover:bg-white/20 focus:bg-white/10 rounded-full py-3 pl-12 pr-4 outline-none transition-all border border-transparent focus:border-white/20"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchSongs(e.target.value);
                  }}
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-6">Explorar todo</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {GENRES.map(g => (
                    <div 
                      key={g} 
                      onClick={() => fetchSongs(undefined, g)}
                      className="aspect-square rounded-lg p-4 font-bold text-xl cursor-pointer hover:scale-105 transition-transform overflow-hidden relative"
                      style={{ backgroundColor: `hsl(${Math.random() * 360}, 60%, 40%)` }}
                    >
                      {g}
                      <img src={`https://picsum.photos/seed/${g}/200/200`} className="absolute -right-4 -bottom-4 w-24 h-24 rotate-[25deg] shadow-2xl" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="h-24 bg-black border-t border-white/5 px-4 flex items-center justify-between fixed bottom-0 left-0 right-0 z-50 glass">
        <div className="flex items-center space-x-4 w-1/3 min-w-0">
          {currentSong ? (
            <>
              <img src={currentSong.artwork_url} className="w-14 h-14 rounded-md shadow-lg" referrerPolicy="no-referrer" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate hover:underline cursor-pointer">{currentSong.title}</div>
                <div className="text-xs text-gray-400 truncate hover:underline cursor-pointer hover:text-white">{currentSong.artist}</div>
              </div>
              <button className="text-gray-400 hover:text-white transition-colors"><Heart size={16} /></button>
            </>
          ) : (
            <div className="text-gray-500 text-sm italic">Selecciona una canción...</div>
          )}
        </div>

        <div className="flex flex-col items-center max-w-xl w-1/3">
          <div className="flex items-center space-x-6 mb-2">
            <button className="text-gray-400 hover:text-white transition-colors"><Shuffle size={16} /></button>
            <button className="text-gray-400 hover:text-white transition-colors"><SkipBack size={24} fill="currentColor" /></button>
            <button 
              onClick={() => currentSong && setIsPlaying(!isPlaying)}
              disabled={!currentSong}
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
            >
              {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
            </button>
            <button onClick={handleNext} className="text-gray-400 hover:text-white transition-colors"><SkipForward size={24} fill="currentColor" /></button>
            <button className="text-gray-400 hover:text-white transition-colors"><Repeat size={16} /></button>
          </div>
          <div className="flex items-center space-x-2 w-full">
            <span className="text-[10px] text-gray-400 w-8 text-right font-mono">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full relative group cursor-pointer overflow-hidden">
               <div 
                 className="h-full bg-white group-hover:bg-green-500 rounded-full" 
                 style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
               />
            </div>
            <span className="text-[10px] text-gray-400 w-8 font-mono">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 w-1/3">
          <button className="text-gray-400 hover:text-white"><MoreHorizontal size={20} /></button>
          <Volume2 size={20} className="text-gray-400" />
          <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-white hover:bg-green-500 rounded-full" 
              style={{ width: `${volume * 100}%` }}
            />
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
            onSuccess={(u, t) => {
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
        "flex items-center space-x-4 cursor-pointer transition-colors font-bold text-sm",
        active ? "text-white" : "text-gray-400 hover:text-white"
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function GenreCard({ genre, onClick }: { genre: string, onClick: () => Promise<void>, key?: any }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white/10 hover:bg-white/20 transition-all rounded flex items-center cursor-pointer group shadow-lg"
    >
      <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-l shadow-xl flex items-center justify-center font-bold text-white/50 text-xs text-center p-2">
        {genre.split(' ')[0]}
      </div>
      <span className="flex-1 px-4 font-bold truncate">{genre}</span>
      <div className="mr-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
          <Play fill="black" size={20} className="ml-1" />
        </div>
      </div>
    </div>
  );
}

function SongCard({ song, onClick, isActive, isPlaying }: { song: Song, onClick: () => void, isActive?: boolean, isPlaying?: boolean, key?: any }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white/5 hover:bg-white/10 p-4 rounded-lg cursor-pointer transition-all group relative",
        isActive && "bg-white/15 shadow-2xl"
      )}
    >
      <div className="relative aspect-square mb-4 shadow-xl">
        <img src={song.artwork_url} className="w-full h-full object-cover rounded-md" referrerPolicy="no-referrer" />
        <div className={cn(
          "absolute right-2 bottom-2 w-12 h-12 bg-green-500 rounded-full shadow-2xl flex items-center justify-center transition-all transform",
          isPlaying ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
        )}>
          {isPlaying ? <Pause fill="black" size={24} /> : <Play fill="black" size={24} className="ml-1" />}
        </div>
      </div>
      <div className="font-bold truncate text-sm mb-1">{song.title}</div>
      <div className="text-xs text-gray-400 truncate">{song.artist}</div>
    </div>
  );
}

function AuthModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: (u: User, t: string) => void }) {
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
      onSuccess(data.user, data.token);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#121212] w-full max-w-md p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6"
      >
        <div className="flex justify-center mb-4">
           <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <Play fill="black" size={24} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center">
          {isLogin ? 'Inicia sesión en Sonify' : 'Regístrate gratis'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold mb-2">¿Cómo te llamas?</label>
              <input 
                required
                className="w-full bg-[#3e3e3e] border-none rounded-md px-4 py-3 placeholder-gray-500 outline-none hover:ring-1 hover:ring-gray-400 focus:ring-2 focus:ring-white"
                placeholder="Nombre de usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold mb-2">Correo electrónico</label>
            <input 
              required
              type="email"
              className="w-full bg-[#3e3e3e] border-none rounded-md px-4 py-3 placeholder-gray-500 outline-none hover:ring-1 hover:ring-gray-400 focus:ring-2 focus:ring-white"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-2">Contraseña</label>
            <input 
              required
              type="password"
              className="w-full bg-[#3e3e3e] border-none rounded-md px-4 py-3 placeholder-gray-500 outline-none hover:ring-1 hover:ring-gray-400 focus:ring-2 focus:ring-white"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 text-black font-bold py-3 rounded-full hover:scale-105 transition-transform mt-2 disabled:opacity-50"
          >
            {loading ? 'Cargando...' : (isLogin ? 'Iniciar sesión' : 'Registrarme')}
          </button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-400">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          </span>
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 font-bold hover:text-green-500 underline"
          >
            {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
          </button>
        </div>

        <button 
          onClick={onClose}
          className="w-full text-gray-400 text-sm hover:text-white transition-colors"
        >
          Cerrar
        </button>
      </motion.div>
    </div>
  );
}
