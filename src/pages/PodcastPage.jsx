import React from 'react';
import { FaPodcast, FaSpotify, FaApple, FaGoogle, FaYoutube, FaLeaf, FaTree, FaBinoculars } from 'react-icons/fa';

/**
 * Pagina met informatie over de Menno & Erwin podcast
 */
const PodcastPage = () => {
  // Podcast afleveringen
  const episodes = [
    {
      title: "Vogels spotten in het voorjaar",
      description: "Menno en Erwin gaan op pad in het Amsterdamse Bos om voorjaarsvogels te spotten en bespreken hun favoriete vogelkijkplekken.",
      date: "15 april 2023",
      image: "https://source.unsplash.com/random/300x200/?birds",
      category: "Vogels"
    },
    {
      title: "Paddenstoelen in de herfst",
      description: "Een wandeling door het bos op zoek naar bijzondere paddenstoelen. Welke zijn eetbaar en welke moet je absoluut vermijden?",
      date: "10 oktober 2022",
      image: "https://source.unsplash.com/random/300x200/?mushrooms",
      category: "Planten"
    },
    {
      title: "Strandwandeling en schelpen zoeken",
      description: "Menno en Erwin verkennen de Nederlandse kust en leren je alles over de verschillende schelpen die je kunt vinden.",
      date: "5 juli 2022",
      image: "https://source.unsplash.com/random/300x200/?seashells",
      category: "Natuur"
    },
    {
      title: "Vlinders en insecten in de zomer",
      description: "Ontdek de fascinerende wereld van vlinders en insecten tijdens een zomerse wandeling door de duinen.",
      date: "20 juni 2022",
      image: "https://source.unsplash.com/random/300x200/?butterflies",
      category: "Dieren"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header sectie */}
      <div className="bg-primary-600 text-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center">
          <div className="mb-4 md:mb-0 md:mr-6">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-md">
              <FaPodcast className="text-primary-600 text-6xl" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Menno & Erwin Podcast</h1>
            <p className="text-xl mb-4">Ontdek de natuur met Menno & Erwin</p>
            <p className="text-primary-100">
              Een podcast over wandelen, natuur en alles wat je onderweg kunt ontdekken. 
              Menno en Erwin nemen je mee op hun avonturen en delen hun kennis en enthousiasme over de Nederlandse natuur.
            </p>
          </div>
        </div>
      </div>

      {/* Luister sectie */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <FaLeaf className="text-primary-500 mr-2" />
          Luister naar onze podcast
        </h2>
        
        <p className="text-gray-600 mb-6">
          Je kunt de Menno & Erwin podcast beluisteren op verschillende platforms. 
          Klik op een van de onderstaande links om direct naar je favoriete platform te gaan.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a 
            href="https://open.spotify.com/show/example" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaSpotify className="text-green-500 text-4xl mb-2" />
            <span className="text-gray-800">Spotify</span>
          </a>
          
          <a 
            href="https://podcasts.apple.com/podcast/example" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaApple className="text-gray-800 text-4xl mb-2" />
            <span className="text-gray-800">Apple Podcasts</span>
          </a>
          
          <a 
            href="https://podcasts.google.com/feed/example" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaGoogle className="text-blue-500 text-4xl mb-2" />
            <span className="text-gray-800">Google Podcasts</span>
          </a>
          
          <a 
            href="https://youtube.com/channel/example" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaYoutube className="text-red-500 text-4xl mb-2" />
            <span className="text-gray-800">YouTube</span>
          </a>
        </div>
      </div>

      {/* Recente afleveringen */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <FaBinoculars className="text-primary-500 mr-2" />
          Recente afleveringen
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {episodes.map((episode, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-gray-200 relative">
                <img 
                  src={episode.image} 
                  alt={episode.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                  {episode.category}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-1">{episode.title}</h3>
                <p className="text-gray-500 text-sm mb-2">{episode.date}</p>
                <p className="text-gray-600 text-sm">{episode.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Over ons */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <FaTree className="text-primary-500 mr-2" />
          Over Menno & Erwin
        </h2>
        
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/2 md:pr-6 mb-4 md:mb-0">
            <p className="text-gray-600 mb-4">
              Menno en Erwin zijn twee natuurliefhebbers die hun passie voor de Nederlandse natuur delen via hun podcast. 
              Ze nemen je mee op hun wandelingen en laten je kennismaken met de mooiste plekken en bijzonderste soorten.
            </p>
            <p className="text-gray-600">
              Met hun achtergrond in biologie en natuurfotografie bieden ze een unieke kijk op de natuur om ons heen. 
              Of je nu een ervaren natuurliefhebber bent of net begint met wandelen, de podcast biedt voor iedereen iets interessants.
            </p>
          </div>
          <div className="md:w-1/2">
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-bold text-gray-800 mb-2">Wandeldagboek App</h3>
              <p className="text-gray-600 mb-4">
                De Wandeldagboek app is ontwikkeld als aanvulling op de podcast. 
                Hiermee kun je je eigen wandelingen bijhouden, observaties toevoegen en je ervaringen delen.
              </p>
              <p className="text-gray-600">
                Download de app en ga zelf op ontdekkingstocht in de natuur!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-primary-50 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Contact</h2>
        <p className="text-gray-600 mb-4">
          Heb je vragen, suggesties of wil je gewoon je ervaringen delen? Neem contact met ons op!
        </p>
        <div className="flex flex-col md:flex-row md:items-center">
          <a 
            href="https://www.mennoenerwin.nl" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors mb-2 md:mb-0 md:mr-4 text-center"
          >
            Bezoek onze website
          </a>
          <a 
            href="mailto:info@mennoenerwin.nl"
            className="text-primary-600 hover:underline"
          >
            info@mennoenerwin.nl
          </a>
        </div>
      </div>
    </div>
  );
};

export default PodcastPage; 