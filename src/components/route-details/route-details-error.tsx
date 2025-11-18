'use client';

interface RouteDetailsErrorProps {
  error: string;
}

export function RouteDetailsError({ error }: RouteDetailsErrorProps) {
  const getErrorMessage = (error: string) => {
    if (error.includes('не найдены') || error.includes('NOT_FOUND')) {
      return {
        title: 'Маршруты не найдены',
        message: 'К сожалению, не удалось найти маршруты по указанным параметрам. Попробуйте изменить дату или пункты отправления/назначения.',
      };
    }
    if (error.includes('Нет рейсов') || error.includes('нет доступных')) {
      return {
        title: 'Нет доступных рейсов',
        message: 'На выбранную дату нет доступных рейсов. Попробуйте выбрать другую дату.',
      };
    }
    if (error.includes('Нет соединений')) {
      return {
        title: 'Нет соединений',
        message: 'Между указанными пунктами нет прямых или транзитных соединений.',
      };
    }
    return {
      title: 'Произошла ошибка',
      message: error,
    };
  };

  const { title, message } = getErrorMessage(error);

  return (
    <div className="bg-white rounded-lg shadow-md p-8 text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-dark)' }}>
        {title}
      </h2>
      <p className="text-gray-600 mb-6">{message}</p>
      <button
        onClick={() => window.history.back()}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Вернуться назад
      </button>
    </div>
  );
}


