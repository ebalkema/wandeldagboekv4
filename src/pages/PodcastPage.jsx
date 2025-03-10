import React from 'react';
import { FaPodcast, FaSpotify, FaApple, FaGoogle, FaYoutube, FaLeaf, FaTree, FaBinoculars, FaGlobe } from 'react-icons/fa';

// Website URL
const WEBSITE_URL = 'https://www.mennoenerwin.nl';

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
      image: `${WEBSITE_URL}/images/birds.jpg`,
      category: "Vogels",
      url: `${WEBSITE_URL}/afleveringen/vogels-spotten`
    },
    {
      title: "Paddenstoelen in de herfst",
      description: "Een wandeling door het bos op zoek naar bijzondere paddenstoelen. Welke zijn eetbaar en welke moet je absoluut vermijden?",
      date: "10 oktober 2022",
      image: `${WEBSITE_URL}/images/mushrooms.jpg`,
      category: "Planten",
      url: `${WEBSITE_URL}/afleveringen/paddenstoelen`
    },
    {
      title: "Strandwandeling en schelpen zoeken",
      description: "Menno en Erwin verkennen de Nederlandse kust en leren je alles over de verschillende schelpen die je kunt vinden.",
      date: "5 juli 2022",
      image: `${WEBSITE_URL}/images/seashells.jpg`,
      category: "Natuur",
      url: `${WEBSITE_URL}/afleveringen/strandwandeling`
    },
    {
      title: "Vlinders en insecten in de zomer",
      description: "Ontdek de fascinerende wereld van vlinders en insecten tijdens een zomerse wandeling door de duinen.",
      date: "20 juni 2022",
      image: `${WEBSITE_URL}/images/butterflies.jpg`,
      category: "Insecten",
      url: `${WEBSITE_URL}/afleveringen/vlinders`
    },
    {
      title: "Winterwandeling in de sneeuw",
      description: "Menno en Erwin trotseren de kou en gaan op zoek naar dierensporen in de sneeuw.",
      date: "15 januari 2022",
      image: `${WEBSITE_URL}/images/snow.jpg`,
      category: "Seizoenen",
      url: `${WEBSITE_URL}/afleveringen/winterwandeling`
    },
    {
      title: "Bomen herkennen in het bos",
      description: "Leer hoe je verschillende boomsoorten kunt herkennen aan hun bladeren, schors en vorm.",
      date: "3 mei 2021",
      image: `${WEBSITE_URL}/images/trees.jpg`,
      category: "Planten",
      url: `${WEBSITE_URL}/afleveringen/bomen-herkennen`
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-primary-700 text-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center">
          <div className="bg-primary-800 p-4 rounded-full mb-4 md:mb-0 md:mr-6">
            <FaPodcast className="text-6xl text-white" />
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
          Je kunt de Menno & Erwin podcast beluisteren op onze website. 
          Klik op een van de onderstaande links om direct naar onze website te gaan.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a 
            href={`${WEBSITE_URL}/luister`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaSpotify className="text-green-500 text-4xl mb-2" />
            <span className="text-gray-700 font-medium">Spotify</span>
          </a>
          
          <a 
            href={`${WEBSITE_URL}/luister`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaApple className="text-gray-800 text-4xl mb-2" />
            <span className="text-gray-700 font-medium">Apple Podcasts</span>
          </a>
          
          <a 
            href={`${WEBSITE_URL}/luister`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaGoogle className="text-blue-500 text-4xl mb-2" />
            <span className="text-gray-700 font-medium">Google Podcasts</span>
          </a>
          
          <a 
            href={`${WEBSITE_URL}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FaGlobe className="text-primary-500 text-4xl mb-2" />
            <span className="text-gray-700 font-medium">Onze Website</span>
          </a>
        </div>
      </div>

      {/* Recente afleveringen */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <FaTree className="text-primary-500 mr-2" />
          Recente afleveringen
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {episodes.map((episode, index) => (
            <a 
              key={index} 
              href={episode.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block bg-gray-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-40 bg-gray-200 overflow-hidden">
                <img 
                  src={episode.image} 
                  alt={episode.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `${WEBSITE_URL}/images/default.jpg`;
                  }}
                />
              </div>
              <div className="p-4">
                <span className="inline-block px-2 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded mb-2">
                  {episode.category}
                </span>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{episode.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{episode.date}</p>
                <p className="text-sm text-gray-700">{episode.description}</p>
              </div>
            </a>
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <a 
            href={`${WEBSITE_URL}/afleveringen`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Bekijk alle afleveringen
          </a>
        </div>
      </div>

      {/* Over Menno & Erwin */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <FaBinoculars className="text-primary-500 mr-2" />
          Over Menno & Erwin
        </h2>
        
        <p className="text-gray-700 mb-4">
          Menno en Erwin zijn twee natuurliefhebbers die hun passie voor de Nederlandse natuur delen via hun podcast. 
          Ze nemen je mee op hun wandelingen en leren je alles over de flora en fauna die je onderweg kunt tegenkomen.
        </p>
        
        <p className="text-gray-700 mb-4">
          Met hun achtergrond in biologie en natuurfotografie bieden ze een uniek perspectief op de natuur om ons heen. 
          Of je nu een ervaren wandelaar bent of net begint, de podcast biedt voor iedereen interessante inzichten en tips.
        </p>
        
        <div className="mt-6 text-center">
          <a 
            href={`${WEBSITE_URL}/over-ons`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Lees meer over ons
          </a>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Contact</h2>
        
        <p className="text-gray-700 mb-4">
          Heb je vragen, suggesties of wil je gewoon je ervaringen delen? We horen graag van je!
        </p>
        
        <div className="mt-6 text-center">
          <a 
            href={`${WEBSITE_URL}/contact`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Neem contact op
          </a>
        </div>
      </div>
    </div>
  );
};

export default PodcastPage; 