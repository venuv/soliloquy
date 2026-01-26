import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Play, Clock, User, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

// Curated YouTube performances of Shakespeare soliloquies
// All videos are under 15 minutes - focused on quality short-form performances
const PERFORMANCES = [
  {
    id: 'to-be-or-not-to-be',
    soliloquy: 'To be, or not to be',
    play: 'Hamlet',
    videos: [
      {
        youtubeId: 'SjuZq-8PUw0',
        title: 'Kenneth Branagh - Film (1996)',
        performer: 'Kenneth Branagh',
        duration: '4:15',
        description: 'From the acclaimed unabridged 1996 film adaptation.'
      },
      {
        youtubeId: 'xYZHb2xo0OI',
        title: 'David Tennant - RSC (2009)',
        performer: 'David Tennant',
        duration: '3:30',
        description: 'The emotionally raw RSC production that defined Hamlet for a generation.'
      }
    ]
  },
  {
    id: 'tomorrow-and-tomorrow',
    soliloquy: 'Tomorrow, and tomorrow, and tomorrow',
    play: 'Macbeth',
    videos: [
      {
        youtubeId: '4LDdyafsR7g',
        title: 'Ian McKellen - RSC Performance',
        performer: 'Ian McKellen',
        duration: '2:30',
        description: "McKellen's legendary RSC performance as the tortured Scottish king."
      },
      {
        youtubeId: 'zGbZCgHQ9m8',
        title: 'Ian McKellen - Masterclass Analysis',
        performer: 'Ian McKellen',
        duration: '6:42',
        description: 'McKellen breaks down the speech line by line in this 1979 BBC masterclass.'
      }
    ]
  },
  {
    id: 'now-is-the-winter',
    soliloquy: 'Now is the winter of our discontent',
    play: 'Richard III',
    videos: [
      {
        youtubeId: 'cDxnXgYPnKg',
        title: 'Laurence Olivier - Classic Film (1955)',
        performer: 'Laurence Olivier',
        duration: '4:45',
        description: 'The iconic 1955 film performance that defined Richard III.'
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
        title: 'Kenneth Branagh - Film',
        performer: 'Kenneth Branagh',
        duration: '3:30',
        description: 'The rousing battlefield speech from the 1989 film.'
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
        description: "The legendary 1953 film performance of Mark Antony's funeral oration."
      }
    ]
  },
  // === NEW SPEECHES FROM SCRAPER ===
  {
    id: 'o-what-a-rogue',
    soliloquy: 'O, what a rogue and peasant slave am I',
    play: 'Hamlet',
    videos: [
      {
        youtubeId: 'Fje1acYFQg4',
        title: 'Hamlet Act 2, Scene 2 Soliloquy',
        performer: 'Film Performance',
        duration: '3:39',
        description: 'Hamlet berates himself after watching the Player King weep for Hecuba.'
      }
    ]
  },
  {
    id: 'what-a-piece-of-work',
    soliloquy: 'What a piece of work is man',
    play: 'Hamlet',
    videos: [
      {
        youtubeId: '8205kJSig4A',
        title: 'What a piece of work is man',
        performer: 'Brian Focht',
        duration: '1:35',
        description: "Hamlet's meditation on humanity's nobility and his own melancholy."
      }
    ]
  },
  {
    id: 'is-this-a-dagger',
    soliloquy: 'Is this a dagger which I see before me',
    play: 'Macbeth',
    videos: [
      {
        youtubeId: 'pusU90ov8pQ',
        title: 'Is this a dagger which I see before me?',
        performer: 'Film Performance',
        duration: '3:46',
        description: "Macbeth's hallucination before murdering King Duncan."
      }
    ]
  },
  {
    id: 'out-damned-spot',
    soliloquy: 'Out, damned spot',
    play: 'Macbeth',
    videos: [
      {
        youtubeId: '9dgbbtUbgcM',
        title: 'Judi Dench as Lady Macbeth',
        performer: 'Judi Dench',
        duration: '4:34',
        description: "The haunting sleepwalking scene from the 1979 RSC production."
      }
    ]
  },
  {
    id: 'blow-winds',
    soliloquy: 'Blow, winds, and crack your cheeks',
    play: 'King Lear',
    videos: [
      {
        youtubeId: 'zn955417swY',
        title: 'Roger Allam - Shakespeare Solos',
        performer: 'Roger Allam',
        duration: '2:03',
        description: 'Lear rages against the storm on the heath.'
      }
    ]
  },
  {
    id: 'but-soft-what-light',
    soliloquy: 'But soft, what light through yonder window breaks',
    play: 'Romeo and Juliet',
    videos: [
      {
        youtubeId: 'S0qao2xINsE',
        title: 'Balcony Scene - Zeffirelli Film',
        performer: 'Leonard Whiting',
        duration: '4:24',
        description: "The iconic balcony scene from the 1968 film adaptation."
      }
    ]
  },
  {
    id: 'st-crispins-day',
    soliloquy: 'We few, we happy few, we band of brothers',
    play: 'Henry V',
    videos: [
      {
        youtubeId: '9P8hogkNdu8',
        title: "St. Crispin's Day Speech",
        performer: 'Kenneth Branagh',
        duration: '5:41',
        description: "Henry rallies his troops before the Battle of Agincourt."
      }
    ]
  },
  {
    id: 'this-sceptred-isle',
    soliloquy: 'This royal throne of kings, this sceptred isle',
    play: 'Richard II',
    videos: [
      {
        youtubeId: 'hQQyyMyTHa0',
        title: 'This Sceptered Isle Speech',
        performer: 'Various',
        duration: '7:29',
        description: "John of Gaunt's dying tribute to England."
      }
    ]
  },
  {
    id: 'quality-of-mercy',
    soliloquy: 'The quality of mercy is not strained',
    play: 'The Merchant of Venice',
    videos: [
      {
        youtubeId: 'wmmBT_4dmI0',
        title: 'Laura Carmichael - Shakespeare Solos',
        performer: 'Laura Carmichael',
        duration: '1:38',
        description: "Portia's famous courtroom plea for mercy over justice."
      }
    ]
  },
  {
    id: 'hath-not-a-jew-eyes',
    soliloquy: 'Hath not a Jew eyes?',
    play: 'The Merchant of Venice',
    videos: [
      {
        youtubeId: 'GWLBwkj07OY',
        title: 'David Suchet as Shylock',
        performer: 'David Suchet',
        duration: '1:57',
        description: "Shylock's powerful defense of his humanity."
      }
    ]
  },
  {
    id: 'all-the-worlds-a-stage',
    soliloquy: 'All the world\'s a stage',
    play: 'As You Like It',
    videos: [
      {
        youtubeId: 'rOHhUUWeKN8',
        title: 'The Seven Ages of Man',
        performer: 'RedFrost Motivation',
        duration: '2:59',
        description: "Jaques' meditation on the seven stages of human life."
      }
    ]
  },
  {
    id: 'our-revels-now-are-ended',
    soliloquy: 'Our revels now are ended',
    play: 'The Tempest',
    videos: [
      {
        youtubeId: 'KFNTAsC8qQ0',
        title: 'David Threlfall - Shakespeare Solos',
        performer: 'David Threlfall',
        duration: '1:24',
        description: "Prospero's farewell to his magical powers."
      }
    ]
  },
  {
    id: 'if-music-be-the-food',
    soliloquy: 'If music be the food of love, play on',
    play: 'Twelfth Night',
    videos: [
      {
        youtubeId: 'SJcCLr19tIs',
        title: 'BBC Shakespeare',
        performer: 'BBC Production',
        duration: '2:07',
        description: "Duke Orsino's opening meditation on love and music."
      }
    ]
  },
  {
    id: 'coriolanus-banishment',
    soliloquy: 'You common cry of curs',
    play: 'Coriolanus',
    videos: [
      {
        youtubeId: 'MrAPDOT3xMM',
        title: 'The Tragedy of Coriolanus',
        performer: 'Stage Production',
        duration: '3:14',
        description: "Coriolanus turns on the Roman citizens who banish him."
      }
    ]
  },
]

function YouTubeEmbed({ videoId, title }) {
  return (
    <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden bg-gray-900">
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  )
}

function VideoCard({ video, isExpanded, onToggle }) {
  return (
    <div className="bg-gray-700/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Play size={16} className="text-purple-400 ml-0.5" />
          </div>
          <div>
            <h4 className="font-medium text-white">{video.title}</h4>
            <div className="flex items-center gap-3 text-sm text-gray-400">
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
          <ChevronUp size={20} className="text-gray-400" />
        ) : (
          <ChevronDown size={20} className="text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-gray-400 text-sm">{video.description}</p>
          <YouTubeEmbed videoId={video.youtubeId} title={video.title} />
          <a
            href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
          >
            Watch on YouTube <ExternalLink size={12} />
          </a>
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
    <div className="bg-gray-800 rounded-xl p-6 space-y-4 border border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg text-white font-semibold">
            "{performance.soliloquy}"
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            {performance.play}
          </p>
        </div>
        <Link
          to={`/practice/shakespeare/${performance.id}`}
          className="text-sm bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/30 transition-colors"
        >
          Practice This
        </Link>
      </div>

      <div className="space-y-2">
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

  const plays = [...new Set(PERFORMANCES.map(p => p.play))].sort()

  const filteredPerformances = filter === 'all'
    ? PERFORMANCES
    : PERFORMANCES.filter(p => p.play === filter)

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-gray-400 hover:text-white transition-colors"
            title="Home"
          >
            <Home size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-purple-400">
              Get Inspired
            </h1>
            <p className="text-gray-400 text-sm">
              Watch master performances of the soliloquies you're learning
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Plays
          </button>
          {plays.map(play => (
            <button
              key={play}
              onClick={() => setFilter(play)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                filter === play
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {play}
            </button>
          ))}
        </div>
      </div>

      {/* Performances */}
      <div className="max-w-4xl mx-auto space-y-6">
        {filteredPerformances.map(performance => (
          <SoliloquySection key={performance.id} performance={performance} />
        ))}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto mt-12 text-center">
        <p className="text-gray-500 text-sm">
          Videos embedded from YouTube
        </p>
      </div>
    </div>
  )
}
