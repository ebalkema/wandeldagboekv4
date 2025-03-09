import { Link } from 'react-router-dom';

/**
 * Pagina voor 404 fouten
 */
const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Pagina niet gevonden</h2>
        <p className="text-gray-600 mb-8">
          De pagina die je zoekt bestaat niet of is verplaatst.
        </p>
        <Link
          to="/"
          className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          Terug naar dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage; 