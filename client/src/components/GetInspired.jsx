import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Play, Clock, User, ChevronDown, ChevronUp } from 'lucide-react'

// Curated YouTube performances of Shakespeare soliloquies
// All videos are under 15 minutes - focused on quality short-form performances
const PERFORMANCES = [
  {
    id: 'to-be-or-not-to-be',
    soliloquy: 'To be, or not to be',
    play: 'Hamlet',
    videos: [
      {
        youtubeId: 'zGbZCgHQ9m8',
        title: "Sir Ian McKellen's Masterclass",
        performer: 'Sir Ian McKellen',
        duration: '6:42',
        description: 'An intimate breakdown of the famous soliloquy from one of the greatest Shakespearean actors of our time.'
      },
      {
        youtubeId: 'SjuZq-8PUw0',
        title: 'Benedict Cumberbatch - National Theatre',
        performer: 'Benedict Cumberbatch',
        duration: '4:15',
        description: 'From the acclaimed 2015 National Theatre production, a modern and intense interpretation.'
      }
    ]
  },
  {
    id: 'tomorrow-and-tomorrow',
    soliloquy: 'Tomorrow, and tomorrow, and tomorrow',
    play: 'Macbeth',
    videos: [
      {
        youtubeId: 'HZnaXDRwu84',
        title: 'Ian McKellen - Royal Shakespeare Company',
        performer: 'Ian McKellen',
        duration: '2:30',
        description: "From McKellen's legendary RSC performance as the tortured Scottish king."
      },
      {
        youtubeId: 'zWz1wTj9pIQ',
        title: 'Patrick Stewart Performance',
        performer: 'Patrick Stewart',
        duration: '3:15',
        description: 'A powerful, intimate rendition from the acclaimed stage and screen actor.'
      }
    ]
  },
  {
    id: 'now-is-the-winter',
    soliloquy: 'Now is the winter of our discontent',
    play: 'Richard III',
    videos: [
      {
        youtubeId: '4Zxe5ojk6C4',
        title: 'Kevin Spacey - Old Vic Theatre',
        performer: 'Kevin Spacey',
        duration: '5:20',
        description: 'Opening soliloquy from the Old Vic production, showcasing Richard\'s cunning villainy.'
      },
      {
        youtubeId: 'eL1CfuzLJB8',
        title: 'Laurence Olivier - Classic Film',
        performer: 'Laurence Olivier',
        duration: '4:45',
        description: 'The iconic 1955 film performance that defined Richard III for generations.'
      }
    ]
  },
  {
    id: 'once-more-unto-the-breach',
    soliloquy: 'Once more unto the breach',
    play: 'Henry V',
    videos: [
      {
        youtubeId: 'A-yZNMWFqvM',
        title: 'Kenneth Branagh - Film Version',
        performer: 'Kenneth Branagh',
        duration: '3:30',
        description: 'The rousing battlefield speech from the 1989 film adaptation.'
      },
      {
        youtubeId: 'hYvM35l0XOc',
        title: 'Tom Hiddleston - The Hollow Crown',
        performer: 'Tom Hiddleston',
        duration: '4:10',
        description: 'From the BBC series, a stirring call to arms before the siege of Harfleur.'
      }
    ]
  },
  {
    id: 'we-few-we-happy-few',
    soliloquy: 'We few, we happy few, we band of brothers',
    play: 'Henry V',
    videos: [
      {
        youtubeId: 'A-yZNMWFqvM',
        title: "St Crispin's Day Speech - Branagh",
        performer: 'Kenneth Branagh',
        duration: '5:00',
        description: 'One of cinema\'s greatest speeches, delivered before the Battle of Agincourt.'
      }
    ]
  },
  {
    id: 'friends-romans-countrymen',
    soliloquy: 'Friends, Romans, countrymen',
    play: 'Julius Caesar',
    videos: [
      {
        youtubeId: '7X9C55TkUP8',
        title: 'Marlon Brando - Classic Film',
        performer: 'Marlon Brando',
        duration: '7:30',
        description: 'The legendary 1953 film performance of Mark Antony\'s funeral oration.'
      },
      {
        youtubeId: 'r9d_sLRXdE4',
        title: 'Damian Lewis - Bridge Theatre',
        performer: 'Damian Lewis',
        duration: '6:45',
        description: 'A contemporary staging with audience surrounding the performer.'
      }
    ]
  },
  {
    id: 'quality-of-mercy',
    soliloquy: 'The quality of mercy is not strained',
    play: 'The Merchant of Venice',
    videos: [
      {
        youtubeId: 'GJMnR5o8_qQ',
        title: 'Al Pacino - Film Version',
        performer: 'Al Pacino',
        duration: '3:00',
        description: 'From the 2004 film, Portia disguised as a lawyer delivers this plea for mercy.'
      }
    ]
  },
  {
    id: 'our-revels-now-are-ended',
    soliloquy: 'Our revels now are ended',
    play: 'The Tempest',
    videos: [
      {
        youtubeId: 'btHdmGbx1aI',
        title: 'John Gielgud Performance',
        performer: 'John Gielgud',
        duration: '2:30',
        description: "Prospero's famous farewell to his magical powers, performed by a master."
      }
    ]
  },
  {
    id: 'all-the-worlds-a-stage',
    soliloquy: "All the world's a stage",
    play: 'As You Like It',
    videos: [
      {
        youtubeId: 'qnEpoOqD2Ko',
        title: 'Seven Ages of Man - Various',
        performer: 'Various Artists',
        duration: '4:00',
        description: 'A compilation of performances of this beloved meditation on life\'s stages.'
      }
    ]
  },
  {
    id: 'blow-winds',
    soliloquy: 'Blow, winds, and crack your cheeks',
    play: 'King Lear',
    videos: [
      {
        youtubeId: '1l3OyzHMDw4',
        title: 'Ian McKellen - Storm Scene',
        performer: 'Ian McKellen',
        duration: '5:30',
        description: 'Lear raging against the storm, from the 2008 RSC production.'
      }
    ]
  },
  {
    id: 'but-soft-what-light',
    soliloquy: 'But soft, what light through yonder window breaks',
    play: 'Romeo and Juliet',
    videos: [
      {
        youtubeId: 'UqOL2dkKcEY',
        title: 'Leonardo DiCaprio - 1996 Film',
        performer: 'Leonardo DiCaprio',
        duration: '3:45',
        description: "The balcony scene from Baz Luhrmann's modern adaptation."
      }
    ]
  },
  {
    id: 'out-damned-spot',
    soliloquy: 'Out, damned spot',
    play: 'Macbeth',
    videos: [
      {
        youtubeId: 'SlcWrnNVXsA',
        title: 'Judi Dench - RSC',
        performer: 'Dame Judi Dench',
        duration: '4:00',
        description: "Lady Macbeth's guilt-ridden sleepwalking scene from the legendary 1976 production."
      }
    ]
  }
]

// Decorative flourish SVG component
function Flourish({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 30"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M100 15 C80 15 70 5 50 5 C30 5 20 15 0 15 M100 15 C120 15 130 5 150 5 C170 5 180 15 200 15"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="100" cy="15" r="4" />
      <circle cx="50" cy="5" r="2" />
      <circle cx="150" cy="5" r="2" />
    </svg>
  )
}

// Woodcut-style decorative border
function WoodcutBorder() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-700/40" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-700/40" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-700/40" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-700/40" />
    </div>
  )
}

function YouTubeEmbed({ videoId, title }) {
  return (
    <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden border-2 border-amber-900/30 shadow-lg">
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?rel=0`}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

function VideoCard({ video, isExpanded, onToggle }) {
  return (
    <div
      className="border border-amber-900/30 rounded-lg overflow-hidden transition-all"
      style={{ backgroundColor: 'rgba(139, 90, 43, 0.1)' }}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-amber-900/10 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-amber-800"
            style={{ backgroundColor: 'rgba(139, 69, 19, 0.3)' }}
          >
            <Play size={16} className="text-amber-200 ml-0.5" />
          </div>
          <div>
            <h4
              className="font-medium text-amber-100"
              style={{ fontFamily: "'IM Fell English', serif" }}
            >
              {video.title}
            </h4>
            <div className="flex items-center gap-3 text-sm text-amber-300/70">
              <span className="flex items-center gap-1">
                <User size={12} />
                {video.performer}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {video.duration}
              </span>
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={20} className="text-amber-400" />
        ) : (
          <ChevronDown size={20} className="text-amber-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <p
            className="text-amber-200/70 text-sm italic"
            style={{ fontFamily: "'IM Fell English', serif" }}
          >
            {video.description}
          </p>
          <YouTubeEmbed videoId={video.youtubeId} title={video.title} />
        </div>
      )}
    </div>
  )
}

function SoliloquySection({ performance }) {
  const [expandedVideo, setExpandedVideo] = useState(null)

  const toggleVideo = (index) => {
    setExpandedVideo(expandedVideo === index ? null : index)
  }

  return (
    <div
      className="relative rounded-xl p-6 space-y-4 border border-amber-900/40"
      style={{
        background: 'linear-gradient(135deg, rgba(139, 90, 43, 0.15) 0%, rgba(101, 67, 33, 0.2) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.3)'
      }}
    >
      <WoodcutBorder />

      <div className="flex items-start justify-between relative">
        <div>
          <h3
            className="text-xl text-amber-300 font-semibold"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            "{performance.soliloquy}"
          </h3>
          <p
            className="text-amber-200/60 mt-1 italic"
            style={{ fontFamily: "'IM Fell English', serif" }}
          >
            — from {performance.play}
          </p>
        </div>
        <Link
          to={`/practice/shakespeare/${performance.id}`}
          className="text-sm border border-amber-600/50 text-amber-300 px-3 py-1.5 rounded hover:bg-amber-600/20 transition-colors"
          style={{ fontFamily: "'Cinzel', serif", fontSize: '0.75rem', letterSpacing: '0.05em' }}
        >
          PRACTISE THIS
        </Link>
      </div>

      <div className="space-y-3">
        {performance.videos.map((video, index) => (
          <VideoCard
            key={video.youtubeId}
            video={video}
            isExpanded={expandedVideo === index}
            onToggle={() => toggleVideo(index)}
          />
        ))}
      </div>
    </div>
  )
}

export default function GetInspired() {
  const [filter, setFilter] = useState('all')

  // Get unique plays for filter
  const plays = [...new Set(PERFORMANCES.map(p => p.play))].sort()

  const filteredPerformances = filter === 'all'
    ? PERFORMANCES
    : PERFORMANCES.filter(p => p.play === filter)

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: 'linear-gradient(180deg, #1a1410 0%, #2d1f15 50%, #1a1410 100%)',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Parchment texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8 relative">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-amber-400/70 hover:text-amber-300 transition-colors p-2 border border-amber-900/30 rounded-lg hover:bg-amber-900/20"
              title="Home"
            >
              <Home size={20} />
            </Link>
            <div className="text-center flex-1">
              <h1
                className="text-3xl font-bold text-amber-300 tracking-wide"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                GET INSPIRED
              </h1>
              <Flourish className="w-40 h-6 text-amber-600/50 mx-auto mt-2" />
              <p
                className="text-amber-200/60 text-sm mt-2 italic"
                style={{ fontFamily: "'IM Fell English', serif" }}
              >
                Behold the Masters perform the very words you endeavour to learn
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative quote */}
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <blockquote
          className="text-amber-200/50 text-lg italic"
          style={{ fontFamily: "'IM Fell English', serif" }}
        >
          "All the world's a stage, and all the men and women merely players"
        </blockquote>
        <p
          className="text-amber-300/40 text-sm mt-2"
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.1em' }}
        >
          — AS YOU LIKE IT, ACT II, SCENE VII
        </p>
      </div>

      {/* Filter */}
      <div className="max-w-4xl mx-auto mb-8">
        <div
          className="flex flex-wrap gap-2 justify-center p-4 rounded-xl border border-amber-900/30"
          style={{ backgroundColor: 'rgba(139, 90, 43, 0.1)' }}
        >
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded text-sm transition-colors border ${
              filter === 'all'
                ? 'bg-amber-700/40 text-amber-200 border-amber-600/50'
                : 'text-amber-300/70 border-amber-900/30 hover:bg-amber-900/20 hover:text-amber-200'
            }`}
            style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}
          >
            ALL PLAYS
          </button>
          {plays.map(play => (
            <button
              key={play}
              onClick={() => setFilter(play)}
              className={`px-4 py-2 rounded text-sm transition-colors border ${
                filter === play
                  ? 'bg-amber-700/40 text-amber-200 border-amber-600/50'
                  : 'text-amber-300/70 border-amber-900/30 hover:bg-amber-900/20 hover:text-amber-200'
              }`}
              style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}
            >
              {play.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Performances Grid */}
      <div className="max-w-4xl mx-auto space-y-6">
        {filteredPerformances.map(performance => (
          <SoliloquySection key={performance.id} performance={performance} />
        ))}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto mt-16 text-center">
        <Flourish className="w-32 h-6 text-amber-600/30 mx-auto mb-4" />
        <p
          className="text-amber-400/40 text-sm italic"
          style={{ fontFamily: "'IM Fell English', serif" }}
        >
          "The play's the thing wherein I'll catch the conscience of the king"
        </p>
        <p
          className="text-amber-300/30 text-xs mt-2"
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.1em' }}
        >
          VIDEOS EMBEDDED FROM YOUTUBE
        </p>
      </div>
    </div>
  )
}
