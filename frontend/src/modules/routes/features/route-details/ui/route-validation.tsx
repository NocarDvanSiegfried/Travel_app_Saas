'use client'

interface RouteValidationProps {
  validation?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
    segmentValidations?: Array<{
      segmentId: string
      isValid: boolean
      errors: string[]
      warnings: string[]
    }>
  }
  realityCheck?: {
    hasIssues: boolean
    issues: Array<{
      type: string
      segmentId: string
      message: string
      correction?: {
        type: string
        suggestedValue: unknown
        confidence: number
      }
    }>
    recommendations: string[]
  }
}

/**
 * Компонент для отображения валидации и проверки реалистичности маршрута
 */
export function RouteValidation({ validation, realityCheck }: RouteValidationProps) {
  if (!validation && !realityCheck) {
    return null
  }

  return (
    <div className="space-y-md">
      {/* Валидация маршрута */}
      {validation && (
        <div className="card p-lg">
          <h2 className="text-xl font-medium mb-md text-heading">
            Валидация маршрута
          </h2>
          
          {validation.isValid ? (
            <div className="flex items-center gap-sm text-success">
              <span className="text-lg">✓</span>
              <span>Маршрут валиден</span>
            </div>
          ) : (
            <div className="space-y-sm">
              {validation.errors.length > 0 && (
                <div>
                  <h3 className="text-md font-medium mb-sm text-primary">Ошибки:</h3>
                  <ul className="list-disc list-inside space-y-xs text-secondary">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div>
                  <h3 className="text-md font-medium mb-sm text-primary">Предупреждения:</h3>
                  <ul className="list-disc list-inside space-y-xs text-secondary">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Валидация сегментов */}
          {validation.segmentValidations && validation.segmentValidations.length > 0 && (
            <div className="mt-md border-t pt-md">
              <h3 className="text-md font-medium mb-sm text-primary">Валидация сегментов:</h3>
              <div className="space-y-sm">
                {validation.segmentValidations.map((segmentValidation) => (
                  <div key={segmentValidation.segmentId} className="text-sm">
                    <div className="font-medium text-primary mb-xs">
                      Сегмент {segmentValidation.segmentId}
                    </div>
                    {segmentValidation.isValid ? (
                      <div className="text-success text-xs">✓ Валиден</div>
                    ) : (
                      <div className="space-y-xs">
                        {segmentValidation.errors.length > 0 && (
                          <ul className="list-disc list-inside text-error text-xs">
                            {segmentValidation.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        )}
                        {segmentValidation.warnings.length > 0 && (
                          <ul className="list-disc list-inside text-warning text-xs">
                            {segmentValidation.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Проверка реалистичности */}
      {realityCheck && (
        <div className="card p-lg">
          <h2 className="text-xl font-medium mb-md text-heading">
            Проверка реалистичности
          </h2>
          
          {!realityCheck.hasIssues ? (
            <div className="flex items-center gap-sm text-success">
              <span className="text-lg">✓</span>
              <span>Маршрут соответствует реальным данным</span>
            </div>
          ) : (
            <div className="space-y-sm">
              <div>
                <h3 className="text-md font-medium mb-sm text-primary">Обнаруженные несоответствия:</h3>
                <ul className="space-y-sm">
                  {realityCheck.issues.map((issue, index) => (
                    <li key={index} className="border-l-2 border-warning pl-sm">
                      <div className="text-sm font-medium text-primary mb-xs">
                        {issue.type === 'distance_mismatch' && 'Несоответствие расстояния'}
                        {issue.type === 'price_mismatch' && 'Несоответствие цены'}
                        {issue.type === 'path_mismatch' && 'Несоответствие пути'}
                        {issue.type === 'hub_mismatch' && 'Несоответствие хабов'}
                        {issue.type === 'transfer_mismatch' && 'Несоответствие пересадок'}
                        {issue.type === 'seasonality_mismatch' && 'Несоответствие сезонности'}
                        {!['distance_mismatch', 'price_mismatch', 'path_mismatch', 'hub_mismatch', 'transfer_mismatch', 'seasonality_mismatch'].includes(issue.type) && issue.type}
                      </div>
                      <div className="text-xs text-secondary mb-xs">
                        Сегмент: {issue.segmentId}
                      </div>
                      <div className="text-sm text-secondary">
                        {issue.message}
                      </div>
                      {issue.correction && (
                        <div className="text-xs text-tertiary mt-xs">
                          Предложенная коррекция: {String(issue.correction.suggestedValue)} (уверенность: {(issue.correction.confidence * 100).toFixed(0)}%)
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              {realityCheck.recommendations.length > 0 && (
                <div className="mt-md border-t pt-md">
                  <h3 className="text-md font-medium mb-sm text-primary">Рекомендации:</h3>
                  <ul className="list-disc list-inside space-y-xs text-secondary text-sm">
                    {realityCheck.recommendations.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}




