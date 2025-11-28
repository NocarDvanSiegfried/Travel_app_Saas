warning: in the working copy of 'backend/src/presentation/controllers/SmartRouteController.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'frontend/src/app/routes/page.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'frontend/src/modules/routes/domain/types.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'frontend/src/modules/routes/features/route-map/lib/smart-route-map-renderer.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'frontend/src/modules/routes/lib/smart-route-adapter.ts', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'frontend/src/modules/routes/utils/smart-route-to-built-route-adapter.ts', LF will be replaced by CRLF the next time Git touches it
diff --git a/backend/src/application/risk-engine/risk-service/SegmentRiskService.ts b/backend/src/application/risk-engine/risk-service/SegmentRiskService.ts
index 450a467..35c08c9 100644
--- a/backend/src/application/risk-engine/risk-service/SegmentRiskService.ts
+++ b/backend/src/application/risk-engine/risk-service/SegmentRiskService.ts
@@ -1,37 +1,149 @@
 /**
  * ╨б╨╡╤А╨▓╨╕╤Б ╨┤╨╗╤П ╨╛╤Ж╨╡╨╜╨║╨╕ ╤А╨╕╤Б╨║╨░ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨╛╨▓ ╨╝╨░╤А╤И╤А╤Г╤В╨░
  * 
- * ╨Ю╤Ж╨╡╨╜╨╕╨▓╨░╨╡╤В ╤А╨╕╤Б╨║ ╨┤╨╗╤П ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╤Е ╤Б╨╡╨│╨╝╨╡╨╜╤В╨╛╨▓ ╨╝╨░╤А╤И╤А╤Г╤В╨░.
- * ╨Я╨╛╨║╨░ ╤А╨╡╨░╨╗╨╕╨╖╨╛╨▓╨░╨╜ ╨║╨░╨║ ╨╖╨░╨│╨╗╤Г╤И╨║╨░, ╨┐╨╛╨╗╨╜╨░╤П ╤А╨╡╨░╨╗╨╕╨╖╨░╤Ж╨╕╤П ╨▒╤Г╨┤╨╡╤В ╨▓ ╤Б╨╗╨╡╨┤╤Г╤О╤Й╨╕╤Е ╨┐╨╛╨┤╤Д╨░╨╖╨░╤Е.
+ * ╨Ю╤Ж╨╡╨╜╨╕╨▓╨░╨╡╤В ╤А╨╕╤Б╨║ ╨┤╨╗╤П ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╤Е ╤Б╨╡╨│╨╝╨╡╨╜╤В╨╛╨▓ ╨╝╨░╤А╤И╤А╤Г╤В╨░ ╤Б ╨╕╤Б╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╨╜╨╕╨╡╨╝ ╤Д╨░╨║╤В╨╛╤А╨╛╨▓ ╤А╨╕╤Б╨║╨░.
  */
 
 import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
-import type { IRiskScore } from '../../../domain/entities/RiskAssessment';
+import type { IRiskScore, ISegmentRiskFactors } from '../../../domain/entities/RiskAssessment';
 import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
 import { RiskLevel } from '../../../domain/entities/RiskAssessment';
+import { RiskFactorFactory } from '../risk-factors/RiskFactorFactory';
+import { UnifiedRiskCalculator } from '../risk-calculator/UnifiedRiskCalculator';
+import { WeatherDataProvider } from '../data-providers/WeatherDataProvider';
+import { HistoricalDataCollector } from '../data-collector/HistoricalDataCollector';
+import { ScheduleRegularityCollector } from '../data-collector/ScheduleRegularityCollector';
+import { RiskContext } from '../base/RiskContext';
 
 /**
  * ╨б╨╡╤А╨▓╨╕╤Б ╨┤╨╗╤П ╨╛╤Ж╨╡╨╜╨║╨╕ ╤А╨╕╤Б╨║╨░ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨╛╨▓ ╨╝╨░╤А╤И╤А╤Г╤В╨░
  */
 export class SegmentRiskService {
+  private readonly riskCalculator: UnifiedRiskCalculator;
+  private readonly weatherProvider: WeatherDataProvider;
+  
+  constructor() {
+    this.riskCalculator = new UnifiedRiskCalculator();
+    this.weatherProvider = new WeatherDataProvider();
+    RiskFactorFactory.initialize();
+  }
+  
   /**
    * ╨Ю╤Ж╨╡╨╜╨╕╤В╤М ╤А╨╕╤Б╨║ ╨┤╨╗╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ ╨╝╨░╤А╤И╤А╤Г╤В╨░
    * 
    * @param segment - ╨б╨╡╨│╨╝╨╡╨╜╤В ╨┤╨╗╤П ╨╛╤Ж╨╡╨╜╨║╨╕
    * @param context - ╨Ъ╨╛╨╜╤В╨╡╨║╤Б╤В ╨╛╤Ж╨╡╨╜╨║╨╕ ╤А╨╕╤Б╨║╨░
-   * @returns Promise ╤Б ╨╛╤Ж╨╡╨╜╨║╨╛╨╣ ╤А╨╕╤Б╨║╨░ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░
+   * @returns Promise ╤Б ╨╛╤Ж╨╡╨╜╨║╨╛╨╣ ╤А╨╕╤Б╨║╨░ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ (╨▓╨║╨╗╤О╤З╨░╤П factors)
    */
   async assessSegmentRisk(
     segment: IRouteSegment,
     context: IRiskDataContext
   ): Promise<IRiskScore> {
-    // TODO: ╨а╨╡╨░╨╗╨╕╨╖╨╛╨▓╨░╤В╤М ╨┐╨╛╨╗╨╜╤Г╤О ╨╛╤Ж╨╡╨╜╨║╤Г ╤А╨╕╤Б╨║╨░ ╨┤╨╗╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░
-    // ╨Я╨╛╨║╨░ ╨▓╨╛╨╖╨▓╤А╨░╤Й╨░╨╡╨╝ ╨┤╨╡╤Д╨╛╨╗╤В╨╜╤Г╤О ╨╛╤Ж╨╡╨╜╨║╤Г
-    return {
-      value: 5,
-      level: RiskLevel.MEDIUM,
-      description: '╨б╤А╨╡╨┤╨╜╨╕╨╣ ╤А╨╕╤Б╨║ (╨╛╤Ж╨╡╨╜╨║╨░ ╨┤╨╗╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ ╨╜╨░╤Е╨╛╨┤╨╕╤В╤Б╤П ╨▓ ╤А╨░╨╖╤А╨░╨▒╨╛╤В╨║╨╡)',
-    };
+    try {
+      // ╨Я╨╛╨╗╤Г╤З╨░╨╡╨╝ ╤Д╨░╨║╤В╨╛╤А╤Л ╤А╨╕╤Б╨║╨░ ╨┤╨╗╤П ╤В╨╕╨┐╨░ ╤В╤А╨░╨╜╤Б╨┐╨╛╤А╤В╨░
+      const factors = RiskFactorFactory.getFactorsForTransportType(segment.transportType);
+      
+      // ╨б╨╛╨▒╨╕╤А╨░╨╡╨╝ ╨┤╨░╨╜╨╜╤Л╨╡ ╨┤╨╗╤П ╤Д╨░╨║╤В╨╛╤А╨╛╨▓
+      const dataMap = new Map<string, unknown>();
+      
+      // ╨Я╨╛╨│╨╛╨┤╨░
+      try {
+        const weatherData = await this.weatherProvider.getDataForSegment(segment, context);
+        dataMap.set('weather', {
+          riskLevel: weatherData.riskLevel,
+          conditions: weatherData.conditions || [],
+          visibility: weatherData.visibility,
+          windSpeed: weatherData.windSpeed,
+          temperature: weatherData.temperature,
+        });
+      } catch (error) {
+        console.warn('[SegmentRiskService] Failed to get weather data:', error);
+        dataMap.set('weather', { riskLevel: 0.2, conditions: [] });
+      }
+      
+      // ╨Ш╤Б╤В╨╛╤А╨╕╤З╨╡╤Б╨║╨╕╨╡ ╨┤╨░╨╜╨╜╤Л╨╡ (╨╖╨░╨│╨╗╤Г╤И╨║╨╕, ╤В╨░╨║ ╨║╨░╨║ ╨╜╤Г╨╢╨╡╨╜ ╨┤╨╛╤Б╤В╤Г╨┐ ╨║ OData)
+      dataMap.set('historicalDelay', 0);
+      dataMap.set('delayFrequency', 0);
+      dataMap.set('cancellationRate', 0);
+      dataMap.set('occupancy', 0.5);
+      dataMap.set('availableSeats', undefined);
+      dataMap.set('scheduleRegularity', 0.8);
+      
+      // ╨Т╤Л╤З╨╕╤Б╨╗╤П╨╡╨╝ ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В╤Л ╤Д╨░╨║╤В╨╛╤А╨╛╨▓
+      const factorResults = await Promise.all(
+        factors.map((factor) => factor.calculateForSegment(segment, context, dataMap))
+      );
+      
+      // ╨Т╤Л╤З╨╕╤Б╨╗╤П╨╡╨╝ ╨╕╤В╨╛╨│╨╛╨▓╤Л╨╣ ╤А╨╕╤Б╨║
+      const riskScore = await this.riskCalculator.calculate(factorResults);
+      
+      // ╨б╨╛╨▒╨╕╤А╨░╨╡╨╝ ╤Д╨░╨║╤В╨╛╤А╤Л ╨┤╨╗╤П ╨▓╨╛╨╖╨▓╤А╨░╤В╨░
+      const factorsData: ISegmentRiskFactors = {
+        weather: dataMap.get('weather') as ISegmentRiskFactors['weather'] | undefined,
+        delays: {
+          avg30: 0,
+          avg60: 0,
+          avg90: 0,
+          delayFreq: 0,
+        },
+        cancellations: {
+          rate30: 0,
+          rate60: 0,
+          rate90: 0,
+          total: 0,
+        },
+        occupancy: {
+          avg: 0.5,
+          highLoadPercent: 0,
+        },
+        seasonality: {
+          month: new Date(context.date).getMonth() + 1,
+          riskFactor: 1,
+        },
+        schedule: {
+          regularityScore: 0.8,
+        },
+      };
+      
+      // ╨Х╤Б╨╗╨╕ ╨╡╤Б╤В╤М ╨┤╨░╨╜╨╜╤Л╨╡ ╨╛ ╨┐╨╛╨│╨╛╨┤╨╡, ╨╛╨▒╨╜╨╛╨▓╨╗╤П╨╡╨╝ factors
+      const weatherData = dataMap.get('weather') as any;
+      if (weatherData) {
+        factorsData.weather = {
+          temperature: weatherData.temperature,
+          visibility: weatherData.visibility,
+          wind: weatherData.windSpeed,
+          storms: weatherData.conditions?.some((c: string) => 
+            c.toLowerCase().includes('╨│╤А╨╛╨╖╨░') || 
+            c.toLowerCase().includes('storm') ||
+            c.toLowerCase().includes('╤И╤В╨╛╤А╨╝')
+          ),
+        };
+      }
+      
+      return {
+        ...riskScore,
+        factors: factorsData,
+      };
+    } catch (error) {
+      console.error('[SegmentRiskService] Error assessing segment risk:', error);
+      // ╨Т╨╛╨╖╨▓╤А╨░╤Й╨░╨╡╨╝ ╨┤╨╡╤Д╨╛╨╗╤В╨╜╤Г╤О ╨╛╤Ж╨╡╨╜╨║╤Г ╤Б ╨┐╤Г╤Б╤В╤Л╨╝╨╕ ╤Д╨░╨║╤В╨╛╤А╨░╨╝╨╕
+      return {
+        value: 5,
+        level: RiskLevel.MEDIUM,
+        description: '╨б╤А╨╡╨┤╨╜╨╕╨╣ ╤А╨╕╤Б╨║ (╨╛╤Ж╨╡╨╜╨║╨░ ╨┐╨╛ ╤Г╨╝╨╛╨╗╤З╨░╨╜╨╕╤О)',
+        factors: {
+          weather: undefined,
+          delays: { avg30: 0, avg60: 0, avg90: 0, delayFreq: 0 },
+          cancellations: { rate30: 0, rate60: 0, rate90: 0, total: 0 },
+          occupancy: { avg: 0, highLoadPercent: 0 },
+          seasonality: {
+            month: new Date(context.date).getMonth() + 1,
+            riskFactor: 1,
+          },
+          schedule: { regularityScore: 0 },
+        },
+      };
+    }
   }
   
   /**
diff --git a/backend/src/domain/entities/RiskAssessment.ts b/backend/src/domain/entities/RiskAssessment.ts
index f3ab8ba..b22cb2f 100644
--- a/backend/src/domain/entities/RiskAssessment.ts
+++ b/backend/src/domain/entities/RiskAssessment.ts
@@ -6,6 +6,63 @@ export interface IRiskScore {
   value: number;
   level: RiskLevel;
   description: string;
+  /**
+   * ╨Ф╨╡╤В╨░╨╗╤М╨╜╤Л╨╡ ╤Д╨░╨║╤В╨╛╤А╤Л ╤А╨╕╤Б╨║╨░ ╨┤╨╗╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ (╨╛╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╨╛)
+   */
+  factors?: ISegmentRiskFactors;
+}
+
+/**
+ * ╨д╨░╨║╤В╨╛╤А╤Л ╤А╨╕╤Б╨║╨░ ╨┤╨╗╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ ╨╝╨░╤А╤И╤А╤Г╤В╨░
+ */
+export interface ISegmentRiskFactors {
+  /**
+   * ╨Я╨╛╨│╨╛╨┤╨╜╤Л╨╡ ╤Г╤Б╨╗╨╛╨▓╨╕╤П
+   */
+  weather?: {
+    temperature?: number;
+    visibility?: number;
+    wind?: number;
+    storms?: boolean;
+  };
+  /**
+   * ╨Ш╤Б╤В╨╛╤А╨╕╤З╨╡╤Б╨║╨╕╨╡ ╨╖╨░╨┤╨╡╤А╨╢╨║╨╕
+   */
+  delays?: {
+    avg30: number;
+    avg60: number;
+    avg90: number;
+    delayFreq: number;
+  };
+  /**
+   * ╨Ю╤В╨╝╨╡╨╜╤Л ╤А╨╡╨╣╤Б╨╛╨▓
+   */
+  cancellations?: {
+    rate30: number;
+    rate60: number;
+    rate90: number;
+    total: number;
+  };
+  /**
+   * ╨Ч╨░╨│╤А╤Г╨╢╨╡╨╜╨╜╨╛╤Б╤В╤М
+   */
+  occupancy?: {
+    avg: number;
+    highLoadPercent: number;
+  };
+  /**
+   * ╨б╨╡╨╖╨╛╨╜╨╜╨╛╤Б╤В╤М
+   */
+  seasonality?: {
+    month: number;
+    riskFactor: number;
+  };
+  /**
+   * ╨а╨╡╨│╤Г╨╗╤П╤А╨╜╨╛╤Б╤В╤М ╤А╨░╤Б╨┐╨╕╤Б╨░╨╜╨╕╤П
+   */
+  schedule?: {
+    regularityScore: number;
+  };
 }
 
 export enum RiskLevel {
diff --git a/backend/src/presentation/controllers/SmartRouteController.ts b/backend/src/presentation/controllers/SmartRouteController.ts
index 7a4bcdf..0167aa0 100644
--- a/backend/src/presentation/controllers/SmartRouteController.ts
+++ b/backend/src/presentation/controllers/SmartRouteController.ts
@@ -524,9 +524,21 @@ export async function buildSmartRoute(req: Request, res: Response): Promise<void
               riskContext
             );
 
+            // ╨Я╨╛╨╗╤Г╤З╨░╨╡╨╝ validation ╨┤╨╗╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ ╨╕╨╖ ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В╨░ ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╨╕ ╨╝╨░╤А╤И╤А╤Г╤В╨░
+            const segmentValidation = validation.segmentValidations?.find(
+              (sv) => sv.segmentId === segment.id
+            );
+            
             return {
               ...routeJSON.segments[idx],
               riskScore: segmentAssessment.riskScore,
+              // ╨Ф╨╛╨▒╨░╨▓╨╗╤П╨╡╨╝ ╨┐╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╨╕ ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╤О ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░
+              warnings: segmentValidation?.warnings || [],
+              validation: segmentValidation ? {
+                isValid: segmentValidation.isValid,
+                errors: segmentValidation.errors || [],
+                warnings: segmentValidation.warnings || [],
+              } : undefined,
             };
           } catch (error) {
             console.warn('[SmartRouteController] Failed to assess segment risk', {
diff --git a/frontend/src/app/routes/page.tsx b/frontend/src/app/routes/page.tsx
index 33a91ad..bcebfbb 100644
--- a/frontend/src/app/routes/page.tsx
+++ b/frontend/src/app/routes/page.tsx
@@ -10,6 +10,11 @@ import { formatDuration, formatTime, formatDate, formatPrice } from '@/shared/ut
 
 interface Route extends IBuiltRoute {
   riskAssessment?: IRiskAssessment
+  validation?: {
+    isValid: boolean;
+    errors: string[];
+    warnings: string[];
+  };
 }
 
 /**
@@ -513,6 +518,212 @@ function RoutesContent() {
                                           {seasonality.available ? 'тЬЕ' : 'тЭМ'} {seasonality.season === 'summer' ? '╨Ы╨╡╤В╨╛' : seasonality.season === 'winter' ? '╨Ч╨╕╨╝╨░' : seasonality.season}
                                         </div>
                                       )}
+                                      {/* ╨Ю╤В╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╨╡ ╤А╨╕╤Б╨║╨░ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.riskScore && (
+                                        <div className="mt-xs">
+                                          <RouteRiskBadge riskScore={segment.riskScore} compact />
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.warnings && segment.warnings.length > 0 && (
+                                        <div className="text-xs text-warning mt-xs">
+                                          {segment.warnings.map((warning, wIdx) => (
+                                            <div key={wIdx} className="flex items-start gap-xs">
+                                              <span>тЪая╕П</span>
+                                              <span>{warning}</span>
+                                            </div>
+                                          ))}
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Ю╤И╨╕╨▒╨║╨╕ ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╨╕ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.segmentValidation && !segment.segmentValidation.isValid && segment.segmentValidation.errors.length > 0 && (
+                                        <div className="text-xs text-error mt-xs">
+                                          {segment.segmentValidation.errors.map((error, eIdx) => (
+                                            <div key={eIdx} className="flex items-start gap-xs">
+                                              <span>тЭМ</span>
+                                              <span>{error}</span>
+                                            </div>
+                                          ))}
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╨╕ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.segmentValidation && segment.segmentValidation.warnings.length > 0 && (
+                                        <div className="text-xs text-warning mt-xs">
+                                          {segment.segmentValidation.warnings.map((warning, wIdx) => (
+                                            <div key={wIdx} className="flex items-start gap-xs">
+                                              <span>тЪая╕П</span>
+                                              <span>{warning}</span>
+                                            </div>
+                                          ))}
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Ш╨╜╤В╨╡╤А╨░╨║╤В╨╕╨▓╨╜╤Л╨╣ ╨▒╨╗╨╛╨║ "╨Я╨╛╤З╨╡╨╝╤Г ╤Н╤В╨╛ ╤А╨╕╤Б╨║?" */}
+                                      {segment.riskScore && segment.riskScore.factors && (
+                                        <details className="mt-xs text-xs">
+                                          <summary className="cursor-pointer text-primary hover:text-primary-dark">
+                                            ╨Я╨╛╤З╨╡╨╝╤Г ╤В╨░╨║╨╛╨╣ ╤А╨╕╤Б╨║?
+                                          </summary>
+                                          <div className="mt-xs pl-md space-y-xs">
+                                            {segment.riskScore.factors.weather && (
+                                              <div>
+                                                <strong>╨Я╨╛╨│╨╛╨┤╨░:</strong>{' '}
+                                                {segment.riskScore.factors.weather.temperature !== undefined && `╨в╨╡╨╝╨┐╨╡╤А╨░╤В╤Г╤А╨░: ${segment.riskScore.factors.weather.temperature}┬░C`}
+                                                {segment.riskScore.factors.weather.visibility !== undefined && `, ╨Т╨╕╨┤╨╕╨╝╨╛╤Б╤В╤М: ${segment.riskScore.factors.weather.visibility}╨╝`}
+                                                {segment.riskScore.factors.weather.wind !== undefined && `, ╨Т╨╡╤В╨╡╤А: ${segment.riskScore.factors.weather.wind}╨╝/╤Б`}
+                                                {segment.riskScore.factors.weather.storms && ', ╨и╤В╨╛╤А╨╝╤Л'}
+                                                {!segment.riskScore.factors.weather.temperature && !segment.riskScore.factors.weather.visibility && !segment.riskScore.factors.weather.wind && !segment.riskScore.factors.weather.storms && '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.delays && (
+                                              <div>
+                                                <strong>╨Ч╨░╨┤╨╡╤А╨╢╨║╨╕:</strong>{' '}
+                                                {segment.riskScore.factors.delays.avg30 > 0 || segment.riskScore.factors.delays.avg60 > 0 || segment.riskScore.factors.delays.avg90 > 0
+                                                  ? `╨б╤А╨╡╨┤╨╜╨╕╨╡: 30╨┤=${segment.riskScore.factors.delays.avg30}╨╝, 60╨┤=${segment.riskScore.factors.delays.avg60}╨╝, 90╨┤=${segment.riskScore.factors.delays.avg90}╨╝, ╨з╨░╤Б╤В╨╛╤В╨░: ${(segment.riskScore.factors.delays.delayFreq * 100).toFixed(1)}%`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.occupancy && (
+                                              <div>
+                                                <strong>╨Ч╨░╨│╤А╤Г╨╢╨╡╨╜╨╜╨╛╤Б╤В╤М:</strong>{' '}
+                                                {segment.riskScore.factors.occupancy.avg > 0
+                                                  ? `╨б╤А╨╡╨┤╨╜╤П╤П: ${(segment.riskScore.factors.occupancy.avg * 100).toFixed(0)}%, ╨Т╤Л╤Б╨╛╨║╨░╤П ╨╖╨░╨│╤А╤Г╨╖╨║╨░: ${(segment.riskScore.factors.occupancy.highLoadPercent * 100).toFixed(0)}%`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.schedule && (
+                                              <div>
+                                                <strong>╨а╨╡╨│╤Г╨╗╤П╤А╨╜╨╛╤Б╤В╤М ╤А╨░╤Б╨┐╨╕╤Б╨░╨╜╨╕╤П:</strong>{' '}
+                                                {segment.riskScore.factors.schedule.regularityScore > 0
+                                                  ? `${(segment.riskScore.factors.schedule.regularityScore * 100).toFixed(0)}%`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.seasonality && (
+                                              <div>
+                                                <strong>╨б╨╡╨╖╨╛╨╜╨╜╨╛╤Б╤В╤М:</strong>{' '}
+                                                ╨Ь╨╡╤Б╤П╤Ж: {segment.riskScore.factors.seasonality.month}, ╨д╨░╨║╤В╨╛╤А ╤А╨╕╤Б╨║╨░: {segment.riskScore.factors.seasonality.riskFactor.toFixed(2)}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.cancellations && (
+                                              <div>
+                                                <strong>╨Ю╤В╨╝╨╡╨╜╤Л:</strong>{' '}
+                                                {segment.riskScore.factors.cancellations.rate30 > 0 || segment.riskScore.factors.cancellations.rate60 > 0 || segment.riskScore.factors.cancellations.rate90 > 0
+                                                  ? `30╨┤=${(segment.riskScore.factors.cancellations.rate30 * 100).toFixed(1)}%, 60╨┤=${(segment.riskScore.factors.cancellations.rate60 * 100).toFixed(1)}%, 90╨┤=${(segment.riskScore.factors.cancellations.rate90 * 100).toFixed(1)}%, ╨Т╤Б╨╡╨│╨╛: ${segment.riskScore.factors.cancellations.total}`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                          </div>
+                                        </details>
+                                      )}
+                                      
+                                      {/* ╨б╤В╨░╤А╨░╤П ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╤П (╨┤╨╗╤П ╨╛╨▒╤А╨░╤В╨╜╨╛╨╣ ╤Б╨╛╨▓╨╝╨╡╤Б╤В╨╕╨╝╨╛╤Б╤В╨╕) */}
+                                      {/* ╨Ю╤В╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╨╡ ╤А╨╕╤Б╨║╨░ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.riskScore && (
+                                        <div className="mt-xs">
+                                          <RouteRiskBadge riskScore={segment.riskScore} compact />
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.warnings && segment.warnings.length > 0 && (
+                                        <div className="text-xs text-warning mt-xs">
+                                          {segment.warnings.map((warning, wIdx) => (
+                                            <div key={wIdx} className="flex items-start gap-xs">
+                                              <span>тЪая╕П</span>
+                                              <span>{warning}</span>
+                                            </div>
+                                          ))}
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Ю╤И╨╕╨▒╨║╨╕ ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╨╕ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.segmentValidation && !segment.segmentValidation.isValid && segment.segmentValidation.errors.length > 0 && (
+                                        <div className="text-xs text-error mt-xs">
+                                          {segment.segmentValidation.errors.map((error, eIdx) => (
+                                            <div key={eIdx} className="flex items-start gap-xs">
+                                              <span>тЭМ</span>
+                                              <span>{error}</span>
+                                            </div>
+                                          ))}
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╨╕ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.segmentValidation && segment.segmentValidation.warnings.length > 0 && (
+                                        <div className="text-xs text-warning mt-xs">
+                                          {segment.segmentValidation.warnings.map((warning, wIdx) => (
+                                            <div key={wIdx} className="flex items-start gap-xs">
+                                              <span>тЪая╕П</span>
+                                              <span>{warning}</span>
+                                            </div>
+                                          ))}
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Ш╨╜╤В╨╡╤А╨░╨║╤В╨╕╨▓╨╜╤Л╨╣ ╨▒╨╗╨╛╨║ "╨Я╨╛╤З╨╡╨╝╤Г ╤Н╤В╨╛ ╤А╨╕╤Б╨║?" */}
+                                      {segment.riskScore && segment.riskScore.factors && (
+                                        <details className="mt-xs text-xs">
+                                          <summary className="cursor-pointer text-primary hover:text-primary-dark">
+                                            ╨Я╨╛╤З╨╡╨╝╤Г ╤В╨░╨║╨╛╨╣ ╤А╨╕╤Б╨║?
+                                          </summary>
+                                          <div className="mt-xs pl-md space-y-xs">
+                                            {segment.riskScore.factors.weather && (
+                                              <div>
+                                                <strong>╨Я╨╛╨│╨╛╨┤╨░:</strong>{' '}
+                                                {segment.riskScore.factors.weather.temperature !== undefined && `╨в╨╡╨╝╨┐╨╡╤А╨░╤В╤Г╤А╨░: ${segment.riskScore.factors.weather.temperature}┬░C`}
+                                                {segment.riskScore.factors.weather.visibility !== undefined && `, ╨Т╨╕╨┤╨╕╨╝╨╛╤Б╤В╤М: ${segment.riskScore.factors.weather.visibility}╨╝`}
+                                                {segment.riskScore.factors.weather.wind !== undefined && `, ╨Т╨╡╤В╨╡╤А: ${segment.riskScore.factors.weather.wind}╨╝/╤Б`}
+                                                {segment.riskScore.factors.weather.storms && ', ╨и╤В╨╛╤А╨╝╤Л'}
+                                                {!segment.riskScore.factors.weather.temperature && !segment.riskScore.factors.weather.visibility && !segment.riskScore.factors.weather.wind && !segment.riskScore.factors.weather.storms && '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.delays && (
+                                              <div>
+                                                <strong>╨Ч╨░╨┤╨╡╤А╨╢╨║╨╕:</strong>{' '}
+                                                {segment.riskScore.factors.delays.avg30 > 0 || segment.riskScore.factors.delays.avg60 > 0 || segment.riskScore.factors.delays.avg90 > 0
+                                                  ? `╨б╤А╨╡╨┤╨╜╨╕╨╡: 30╨┤=${segment.riskScore.factors.delays.avg30}╨╝, 60╨┤=${segment.riskScore.factors.delays.avg60}╨╝, 90╨┤=${segment.riskScore.factors.delays.avg90}╨╝, ╨з╨░╤Б╤В╨╛╤В╨░: ${(segment.riskScore.factors.delays.delayFreq * 100).toFixed(1)}%`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.occupancy && (
+                                              <div>
+                                                <strong>╨Ч╨░╨│╤А╤Г╨╢╨╡╨╜╨╜╨╛╤Б╤В╤М:</strong>{' '}
+                                                {segment.riskScore.factors.occupancy.avg > 0
+                                                  ? `╨б╤А╨╡╨┤╨╜╤П╤П: ${(segment.riskScore.factors.occupancy.avg * 100).toFixed(0)}%, ╨Т╤Л╤Б╨╛╨║╨░╤П ╨╖╨░╨│╤А╤Г╨╖╨║╨░: ${(segment.riskScore.factors.occupancy.highLoadPercent * 100).toFixed(0)}%`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.schedule && (
+                                              <div>
+                                                <strong>╨а╨╡╨│╤Г╨╗╤П╤А╨╜╨╛╤Б╤В╤М ╤А╨░╤Б╨┐╨╕╤Б╨░╨╜╨╕╤П:</strong>{' '}
+                                                {segment.riskScore.factors.schedule.regularityScore > 0
+                                                  ? `${(segment.riskScore.factors.schedule.regularityScore * 100).toFixed(0)}%`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.seasonality && (
+                                              <div>
+                                                <strong>╨б╨╡╨╖╨╛╨╜╨╜╨╛╤Б╤В╤М:</strong>{' '}
+                                                ╨Ь╨╡╤Б╤П╤Ж: {segment.riskScore.factors.seasonality.month}, ╨д╨░╨║╤В╨╛╤А ╤А╨╕╤Б╨║╨░: {segment.riskScore.factors.seasonality.riskFactor.toFixed(2)}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.cancellations && (
+                                              <div>
+                                                <strong>╨Ю╤В╨╝╨╡╨╜╤Л:</strong>{' '}
+                                                {segment.riskScore.factors.cancellations.rate30 > 0 || segment.riskScore.factors.cancellations.rate60 > 0 || segment.riskScore.factors.cancellations.rate90 > 0
+                                                  ? `30╨┤=${(segment.riskScore.factors.cancellations.rate30 * 100).toFixed(1)}%, 60╨┤=${(segment.riskScore.factors.cancellations.rate60 * 100).toFixed(1)}%, 90╨┤=${(segment.riskScore.factors.cancellations.rate90 * 100).toFixed(1)}%, ╨Т╤Б╨╡╨│╨╛: ${segment.riskScore.factors.cancellations.total}`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                          </div>
+                                        </details>
+                                      )}
+                                      
+                                      {/* ╨б╤В╨░╤А╨░╤П ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╤П (╨┤╨╗╤П ╨╛╨▒╤А╨░╤В╨╜╨╛╨╣ ╤Б╨╛╨▓╨╝╨╡╤Б╤В╨╕╨╝╨╛╤Б╤В╨╕) */}
                                       {validation && !validation.isValid && validation.errors.length > 0 && (
                                         <div className="text-xs text-error mt-xs">
                                           тЪая╕П {validation.errors[0]}
@@ -526,6 +737,32 @@ function RoutesContent() {
                           </div>
                         )}
 
+                        {/* ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╨╡ ╨┐╨╡╤А╨╡╨┤ ╨┐╨╛╨║╤Г╨┐╨║╨╛╨╣ (╨╡╤Б╨╗╨╕ ╤А╨╕╤Б╨║ >= 5) */}
+                        {(() => {
+                          const routeRisk = route.riskAssessment?.riskScore || (route as any).riskScore;
+                          const hasHighRisk = routeRisk && routeRisk.value >= 5;
+                          const hasHighSegmentRisk = route.segments?.some(
+                            (seg) => seg.riskScore && seg.riskScore.value >= 5
+                          );
+                          
+                          if (hasHighRisk || hasHighSegmentRisk) {
+                            return (
+                              <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
+                                <div className="flex items-center gap-xs text-sm">
+                                  <span>тЪая╕П</span>
+                                  <span className="text-warning font-medium">
+                                    ╨Я╨╛╨▓╤Л╤И╨╡╨╜╨╜╤Л╨╣ ╤А╨╕╤Б╨║ ╨╖╨░╨┤╨╡╤А╨╢╨╡╨║/╨╛╤В╨╝╨╡╨╜
+                                  </span>
+                                </div>
+                                <p className="text-xs text-secondary mt-xs">
+                                  ╨а╨╡╨║╨╛╨╝╨╡╨╜╨┤╤Г╨╡╨╝ ╨▓╨╜╨╕╨╝╨░╤В╨╡╨╗╤М╨╜╨╛ ╨┐╤А╨╛╨▓╨╡╤А╨╕╤В╤М ╤Б╨╡╨│╨╝╨╡╨╜╤В╤Л ╨┐╨╛╨╡╨╖╨┤╨║╨╕ ╨╕ ╤А╨░╤Б╤Б╨╝╨╛╤В╤А╨╡╤В╤М ╤Б╤В╤А╨░╤Е╨╛╨▓╨║╤Г.
+                                </p>
+                              </div>
+                            );
+                          }
+                          return null;
+                        })()}
+
                         {/* ╨Ш╨╜╤Д╨╛╤А╨╝╨░╤Ж╨╕╤П ╨╛ ╤Б╤В╤А╨░╤Е╨╛╨▓╨║╨╡ (╨╡╤Б╨╗╨╕ ╤А╨╕╤Б╨║ ╨▓╤Л╤Б╨╛╨║╨╕╨╣) */}
                         {route.riskAssessment?.riskScore && route.riskAssessment.riskScore.value >= 5 && (
                           <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
@@ -543,6 +780,25 @@ function RoutesContent() {
                             />
                           </div>
                         )}
+                        
+                        {/* ╨Ю╨▒╤Й╨╕╨╡ ╨┐╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╨╝╨░╤А╤И╤А╤Г╤В╨░ */}
+                        {(route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation && (route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings && (route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings.length > 0 && (
+                          <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
+                            <div className="flex items-center gap-xs text-sm mb-xs">
+                              <span>тЪая╕П</span>
+                              <span className="text-warning font-medium">
+                                ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╨┐╨╛ ╨╝╨░╤А╤И╤А╤Г╤В╤Г
+                              </span>
+                            </div>
+                            <div className="space-y-xs">
+                              {(route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings.map((warning: string, idx: number) => (
+                                <div key={idx} className="text-xs text-secondary">
+                                  {warning}
+                                </div>
+                              ))}
+                            </div>
+                          </div>
+                        )}
 
                         {/* ╨Ъ╨╜╨╛╨┐╨║╨░ ╨▓╤Л╨▒╨╛╤А╨░ */}
                         {(() => {
@@ -729,6 +985,212 @@ function RoutesContent() {
                                           {seasonality.available ? 'тЬЕ' : 'тЭМ'} {seasonality.season === 'summer' ? '╨Ы╨╡╤В╨╛' : seasonality.season === 'winter' ? '╨Ч╨╕╨╝╨░' : seasonality.season}
                                         </div>
                                       )}
+                                      {/* ╨Ю╤В╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╨╡ ╤А╨╕╤Б╨║╨░ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.riskScore && (
+                                        <div className="mt-xs">
+                                          <RouteRiskBadge riskScore={segment.riskScore} compact />
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.warnings && segment.warnings.length > 0 && (
+                                        <div className="text-xs text-warning mt-xs">
+                                          {segment.warnings.map((warning, wIdx) => (
+                                            <div key={wIdx} className="flex items-start gap-xs">
+                                              <span>тЪая╕П</span>
+                                              <span>{warning}</span>
+                                            </div>
+                                          ))}
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Ю╤И╨╕╨▒╨║╨╕ ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╨╕ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.segmentValidation && !segment.segmentValidation.isValid && segment.segmentValidation.errors.length > 0 && (
+                                        <div className="text-xs text-error mt-xs">
+                                          {segment.segmentValidation.errors.map((error, eIdx) => (
+                                            <div key={eIdx} className="flex items-start gap-xs">
+                                              <span>тЭМ</span>
+                                              <span>{error}</span>
+                                            </div>
+                                          ))}
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╨╕ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.segmentValidation && segment.segmentValidation.warnings.length > 0 && (
+                                        <div className="text-xs text-warning mt-xs">
+                                          {segment.segmentValidation.warnings.map((warning, wIdx) => (
+                                            <div key={wIdx} className="flex items-start gap-xs">
+                                              <span>тЪая╕П</span>
+                                              <span>{warning}</span>
+                                            </div>
+                                          ))}
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Ш╨╜╤В╨╡╤А╨░╨║╤В╨╕╨▓╨╜╤Л╨╣ ╨▒╨╗╨╛╨║ "╨Я╨╛╤З╨╡╨╝╤Г ╤Н╤В╨╛ ╤А╨╕╤Б╨║?" */}
+                                      {segment.riskScore && segment.riskScore.factors && (
+                                        <details className="mt-xs text-xs">
+                                          <summary className="cursor-pointer text-primary hover:text-primary-dark">
+                                            ╨Я╨╛╤З╨╡╨╝╤Г ╤В╨░╨║╨╛╨╣ ╤А╨╕╤Б╨║?
+                                          </summary>
+                                          <div className="mt-xs pl-md space-y-xs">
+                                            {segment.riskScore.factors.weather && (
+                                              <div>
+                                                <strong>╨Я╨╛╨│╨╛╨┤╨░:</strong>{' '}
+                                                {segment.riskScore.factors.weather.temperature !== undefined && `╨в╨╡╨╝╨┐╨╡╤А╨░╤В╤Г╤А╨░: ${segment.riskScore.factors.weather.temperature}┬░C`}
+                                                {segment.riskScore.factors.weather.visibility !== undefined && `, ╨Т╨╕╨┤╨╕╨╝╨╛╤Б╤В╤М: ${segment.riskScore.factors.weather.visibility}╨╝`}
+                                                {segment.riskScore.factors.weather.wind !== undefined && `, ╨Т╨╡╤В╨╡╤А: ${segment.riskScore.factors.weather.wind}╨╝/╤Б`}
+                                                {segment.riskScore.factors.weather.storms && ', ╨и╤В╨╛╤А╨╝╤Л'}
+                                                {!segment.riskScore.factors.weather.temperature && !segment.riskScore.factors.weather.visibility && !segment.riskScore.factors.weather.wind && !segment.riskScore.factors.weather.storms && '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.delays && (
+                                              <div>
+                                                <strong>╨Ч╨░╨┤╨╡╤А╨╢╨║╨╕:</strong>{' '}
+                                                {segment.riskScore.factors.delays.avg30 > 0 || segment.riskScore.factors.delays.avg60 > 0 || segment.riskScore.factors.delays.avg90 > 0
+                                                  ? `╨б╤А╨╡╨┤╨╜╨╕╨╡: 30╨┤=${segment.riskScore.factors.delays.avg30}╨╝, 60╨┤=${segment.riskScore.factors.delays.avg60}╨╝, 90╨┤=${segment.riskScore.factors.delays.avg90}╨╝, ╨з╨░╤Б╤В╨╛╤В╨░: ${(segment.riskScore.factors.delays.delayFreq * 100).toFixed(1)}%`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.occupancy && (
+                                              <div>
+                                                <strong>╨Ч╨░╨│╤А╤Г╨╢╨╡╨╜╨╜╨╛╤Б╤В╤М:</strong>{' '}
+                                                {segment.riskScore.factors.occupancy.avg > 0
+                                                  ? `╨б╤А╨╡╨┤╨╜╤П╤П: ${(segment.riskScore.factors.occupancy.avg * 100).toFixed(0)}%, ╨Т╤Л╤Б╨╛╨║╨░╤П ╨╖╨░╨│╤А╤Г╨╖╨║╨░: ${(segment.riskScore.factors.occupancy.highLoadPercent * 100).toFixed(0)}%`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.schedule && (
+                                              <div>
+                                                <strong>╨а╨╡╨│╤Г╨╗╤П╤А╨╜╨╛╤Б╤В╤М ╤А╨░╤Б╨┐╨╕╤Б╨░╨╜╨╕╤П:</strong>{' '}
+                                                {segment.riskScore.factors.schedule.regularityScore > 0
+                                                  ? `${(segment.riskScore.factors.schedule.regularityScore * 100).toFixed(0)}%`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.seasonality && (
+                                              <div>
+                                                <strong>╨б╨╡╨╖╨╛╨╜╨╜╨╛╤Б╤В╤М:</strong>{' '}
+                                                ╨Ь╨╡╤Б╤П╤Ж: {segment.riskScore.factors.seasonality.month}, ╨д╨░╨║╤В╨╛╤А ╤А╨╕╤Б╨║╨░: {segment.riskScore.factors.seasonality.riskFactor.toFixed(2)}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.cancellations && (
+                                              <div>
+                                                <strong>╨Ю╤В╨╝╨╡╨╜╤Л:</strong>{' '}
+                                                {segment.riskScore.factors.cancellations.rate30 > 0 || segment.riskScore.factors.cancellations.rate60 > 0 || segment.riskScore.factors.cancellations.rate90 > 0
+                                                  ? `30╨┤=${(segment.riskScore.factors.cancellations.rate30 * 100).toFixed(1)}%, 60╨┤=${(segment.riskScore.factors.cancellations.rate60 * 100).toFixed(1)}%, 90╨┤=${(segment.riskScore.factors.cancellations.rate90 * 100).toFixed(1)}%, ╨Т╤Б╨╡╨│╨╛: ${segment.riskScore.factors.cancellations.total}`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                          </div>
+                                        </details>
+                                      )}
+                                      
+                                      {/* ╨б╤В╨░╤А╨░╤П ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╤П (╨┤╨╗╤П ╨╛╨▒╤А╨░╤В╨╜╨╛╨╣ ╤Б╨╛╨▓╨╝╨╡╤Б╤В╨╕╨╝╨╛╤Б╤В╨╕) */}
+                                      {/* ╨Ю╤В╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╨╡ ╤А╨╕╤Б╨║╨░ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.riskScore && (
+                                        <div className="mt-xs">
+                                          <RouteRiskBadge riskScore={segment.riskScore} compact />
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.warnings && segment.warnings.length > 0 && (
+                                        <div className="text-xs text-warning mt-xs">
+                                          {segment.warnings.map((warning, wIdx) => (
+                                            <div key={wIdx} className="flex items-start gap-xs">
+                                              <span>тЪая╕П</span>
+                                              <span>{warning}</span>
+                                            </div>
+                                          ))}
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Ю╤И╨╕╨▒╨║╨╕ ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╨╕ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.segmentValidation && !segment.segmentValidation.isValid && segment.segmentValidation.errors.length > 0 && (
+                                        <div className="text-xs text-error mt-xs">
+                                          {segment.segmentValidation.errors.map((error, eIdx) => (
+                                            <div key={eIdx} className="flex items-start gap-xs">
+                                              <span>тЭМ</span>
+                                              <span>{error}</span>
+                                            </div>
+                                          ))}
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╨╕ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ */}
+                                      {segment.segmentValidation && segment.segmentValidation.warnings.length > 0 && (
+                                        <div className="text-xs text-warning mt-xs">
+                                          {segment.segmentValidation.warnings.map((warning, wIdx) => (
+                                            <div key={wIdx} className="flex items-start gap-xs">
+                                              <span>тЪая╕П</span>
+                                              <span>{warning}</span>
+                                            </div>
+                                          ))}
+                                        </div>
+                                      )}
+                                      
+                                      {/* ╨Ш╨╜╤В╨╡╤А╨░╨║╤В╨╕╨▓╨╜╤Л╨╣ ╨▒╨╗╨╛╨║ "╨Я╨╛╤З╨╡╨╝╤Г ╤Н╤В╨╛ ╤А╨╕╤Б╨║?" */}
+                                      {segment.riskScore && segment.riskScore.factors && (
+                                        <details className="mt-xs text-xs">
+                                          <summary className="cursor-pointer text-primary hover:text-primary-dark">
+                                            ╨Я╨╛╤З╨╡╨╝╤Г ╤В╨░╨║╨╛╨╣ ╤А╨╕╤Б╨║?
+                                          </summary>
+                                          <div className="mt-xs pl-md space-y-xs">
+                                            {segment.riskScore.factors.weather && (
+                                              <div>
+                                                <strong>╨Я╨╛╨│╨╛╨┤╨░:</strong>{' '}
+                                                {segment.riskScore.factors.weather.temperature !== undefined && `╨в╨╡╨╝╨┐╨╡╤А╨░╤В╤Г╤А╨░: ${segment.riskScore.factors.weather.temperature}┬░C`}
+                                                {segment.riskScore.factors.weather.visibility !== undefined && `, ╨Т╨╕╨┤╨╕╨╝╨╛╤Б╤В╤М: ${segment.riskScore.factors.weather.visibility}╨╝`}
+                                                {segment.riskScore.factors.weather.wind !== undefined && `, ╨Т╨╡╤В╨╡╤А: ${segment.riskScore.factors.weather.wind}╨╝/╤Б`}
+                                                {segment.riskScore.factors.weather.storms && ', ╨и╤В╨╛╤А╨╝╤Л'}
+                                                {!segment.riskScore.factors.weather.temperature && !segment.riskScore.factors.weather.visibility && !segment.riskScore.factors.weather.wind && !segment.riskScore.factors.weather.storms && '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.delays && (
+                                              <div>
+                                                <strong>╨Ч╨░╨┤╨╡╤А╨╢╨║╨╕:</strong>{' '}
+                                                {segment.riskScore.factors.delays.avg30 > 0 || segment.riskScore.factors.delays.avg60 > 0 || segment.riskScore.factors.delays.avg90 > 0
+                                                  ? `╨б╤А╨╡╨┤╨╜╨╕╨╡: 30╨┤=${segment.riskScore.factors.delays.avg30}╨╝, 60╨┤=${segment.riskScore.factors.delays.avg60}╨╝, 90╨┤=${segment.riskScore.factors.delays.avg90}╨╝, ╨з╨░╤Б╤В╨╛╤В╨░: ${(segment.riskScore.factors.delays.delayFreq * 100).toFixed(1)}%`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.occupancy && (
+                                              <div>
+                                                <strong>╨Ч╨░╨│╤А╤Г╨╢╨╡╨╜╨╜╨╛╤Б╤В╤М:</strong>{' '}
+                                                {segment.riskScore.factors.occupancy.avg > 0
+                                                  ? `╨б╤А╨╡╨┤╨╜╤П╤П: ${(segment.riskScore.factors.occupancy.avg * 100).toFixed(0)}%, ╨Т╤Л╤Б╨╛╨║╨░╤П ╨╖╨░╨│╤А╤Г╨╖╨║╨░: ${(segment.riskScore.factors.occupancy.highLoadPercent * 100).toFixed(0)}%`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.schedule && (
+                                              <div>
+                                                <strong>╨а╨╡╨│╤Г╨╗╤П╤А╨╜╨╛╤Б╤В╤М ╤А╨░╤Б╨┐╨╕╤Б╨░╨╜╨╕╤П:</strong>{' '}
+                                                {segment.riskScore.factors.schedule.regularityScore > 0
+                                                  ? `${(segment.riskScore.factors.schedule.regularityScore * 100).toFixed(0)}%`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.seasonality && (
+                                              <div>
+                                                <strong>╨б╨╡╨╖╨╛╨╜╨╜╨╛╤Б╤В╤М:</strong>{' '}
+                                                ╨Ь╨╡╤Б╤П╤Ж: {segment.riskScore.factors.seasonality.month}, ╨д╨░╨║╤В╨╛╤А ╤А╨╕╤Б╨║╨░: {segment.riskScore.factors.seasonality.riskFactor.toFixed(2)}
+                                              </div>
+                                            )}
+                                            {segment.riskScore.factors.cancellations && (
+                                              <div>
+                                                <strong>╨Ю╤В╨╝╨╡╨╜╤Л:</strong>{' '}
+                                                {segment.riskScore.factors.cancellations.rate30 > 0 || segment.riskScore.factors.cancellations.rate60 > 0 || segment.riskScore.factors.cancellations.rate90 > 0
+                                                  ? `30╨┤=${(segment.riskScore.factors.cancellations.rate30 * 100).toFixed(1)}%, 60╨┤=${(segment.riskScore.factors.cancellations.rate60 * 100).toFixed(1)}%, 90╨┤=${(segment.riskScore.factors.cancellations.rate90 * 100).toFixed(1)}%, ╨Т╤Б╨╡╨│╨╛: ${segment.riskScore.factors.cancellations.total}`
+                                                  : '╨Ф╨░╨╜╨╜╤Л╨╡ ╨╛╤В╤Б╤Г╤В╤Б╤В╨▓╤Г╤О╤В'}
+                                              </div>
+                                            )}
+                                          </div>
+                                        </details>
+                                      )}
+                                      
+                                      {/* ╨б╤В╨░╤А╨░╤П ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╤П (╨┤╨╗╤П ╨╛╨▒╤А╨░╤В╨╜╨╛╨╣ ╤Б╨╛╨▓╨╝╨╡╤Б╤В╨╕╨╝╨╛╤Б╤В╨╕) */}
                                       {validation && !validation.isValid && validation.errors.length > 0 && (
                                         <div className="text-xs text-error mt-xs">
                                           тЪая╕П {validation.errors[0]}
@@ -742,6 +1204,32 @@ function RoutesContent() {
                           </div>
                         )}
 
+                        {/* ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╨╡ ╨┐╨╡╤А╨╡╨┤ ╨┐╨╛╨║╤Г╨┐╨║╨╛╨╣ (╨╡╤Б╨╗╨╕ ╤А╨╕╤Б╨║ >= 5) */}
+                        {(() => {
+                          const routeRisk = route.riskAssessment?.riskScore || (route as any).riskScore;
+                          const hasHighRisk = routeRisk && routeRisk.value >= 5;
+                          const hasHighSegmentRisk = route.segments?.some(
+                            (seg) => seg.riskScore && seg.riskScore.value >= 5
+                          );
+                          
+                          if (hasHighRisk || hasHighSegmentRisk) {
+                            return (
+                              <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
+                                <div className="flex items-center gap-xs text-sm">
+                                  <span>тЪая╕П</span>
+                                  <span className="text-warning font-medium">
+                                    ╨Я╨╛╨▓╤Л╤И╨╡╨╜╨╜╤Л╨╣ ╤А╨╕╤Б╨║ ╨╖╨░╨┤╨╡╤А╨╢╨╡╨║/╨╛╤В╨╝╨╡╨╜
+                                  </span>
+                                </div>
+                                <p className="text-xs text-secondary mt-xs">
+                                  ╨а╨╡╨║╨╛╨╝╨╡╨╜╨┤╤Г╨╡╨╝ ╨▓╨╜╨╕╨╝╨░╤В╨╡╨╗╤М╨╜╨╛ ╨┐╤А╨╛╨▓╨╡╤А╨╕╤В╤М ╤Б╨╡╨│╨╝╨╡╨╜╤В╤Л ╨┐╨╛╨╡╨╖╨┤╨║╨╕ ╨╕ ╤А╨░╤Б╤Б╨╝╨╛╤В╤А╨╡╤В╤М ╤Б╤В╤А╨░╤Е╨╛╨▓╨║╤Г.
+                                </p>
+                              </div>
+                            );
+                          }
+                          return null;
+                        })()}
+
                         {/* ╨Ш╨╜╤Д╨╛╤А╨╝╨░╤Ж╨╕╤П ╨╛ ╤Б╤В╤А╨░╤Е╨╛╨▓╨║╨╡ (╨╡╤Б╨╗╨╕ ╤А╨╕╤Б╨║ ╨▓╤Л╤Б╨╛╨║╨╕╨╣) */}
                         {route.riskAssessment?.riskScore && route.riskAssessment.riskScore.value >= 5 && (
                           <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
@@ -759,6 +1247,25 @@ function RoutesContent() {
                             />
                           </div>
                         )}
+                        
+                        {/* ╨Ю╨▒╤Й╨╕╨╡ ╨┐╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╨╝╨░╤А╤И╤А╤Г╤В╨░ */}
+                        {(route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation && (route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings && (route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings.length > 0 && (
+                          <div className="mb-sm p-sm rounded-sm bg-warning-light border border-warning">
+                            <div className="flex items-center gap-xs text-sm mb-xs">
+                              <span>тЪая╕П</span>
+                              <span className="text-warning font-medium">
+                                ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╨┐╨╛ ╨╝╨░╤А╤И╤А╤Г╤В╤Г
+                              </span>
+                            </div>
+                            <div className="space-y-xs">
+                              {(route as Route & { validation?: { isValid: boolean; errors: string[]; warnings: string[] } }).validation!.warnings.map((warning: string, idx: number) => (
+                                <div key={idx} className="text-xs text-secondary">
+                                  {warning}
+                                </div>
+                              ))}
+                            </div>
+                          </div>
+                        )}
 
                         {/* ╨Ъ╨╜╨╛╨┐╨║╨░ ╨▓╤Л╨▒╨╛╤А╨░ */}
                         {(() => {
diff --git a/frontend/src/modules/routes/domain/types.ts b/frontend/src/modules/routes/domain/types.ts
index 9d65fee..0e68282 100644
--- a/frontend/src/modules/routes/domain/types.ts
+++ b/frontend/src/modules/routes/domain/types.ts
@@ -53,7 +53,51 @@ export interface IRouteSegmentDetails {
   /**
    * ╨Ю╤Ж╨╡╨╜╨║╨░ ╤А╨╕╤Б╨║╨░ ╨┤╨╗╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ (╨╛╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╨╛)
    */
-  riskScore?: IRiskScore;
+  riskScore?: IRiskScore & {
+    factors?: {
+      weather?: {
+        temperature?: number;
+        visibility?: number;
+        wind?: number;
+        storms?: boolean;
+      };
+      delays?: {
+        avg30: number;
+        avg60: number;
+        avg90: number;
+        delayFreq: number;
+      };
+      cancellations?: {
+        rate30: number;
+        rate60: number;
+        rate90: number;
+        total: number;
+      };
+      occupancy?: {
+        avg: number;
+        highLoadPercent: number;
+      };
+      seasonality?: {
+        month: number;
+        riskFactor: number;
+      };
+      schedule?: {
+        regularityScore: number;
+      };
+    };
+  };
+  /**
+   * ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╨┤╨╗╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ (╨╛╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╨╛)
+   */
+  warnings?: string[];
+  /**
+   * ╨Т╨░╨╗╨╕╨┤╨░╤Ж╨╕╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ (╨╛╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╨╛)
+   */
+  segmentValidation?: {
+    isValid: boolean;
+    errors: string[];
+    warnings: string[];
+  };
 }
 
 export interface IBuiltRoute {
diff --git a/frontend/src/modules/routes/features/route-map/lib/smart-route-map-renderer.ts b/frontend/src/modules/routes/features/route-map/lib/smart-route-map-renderer.ts
index 0ffe836..e221295 100644
--- a/frontend/src/modules/routes/features/route-map/lib/smart-route-map-renderer.ts
+++ b/frontend/src/modules/routes/features/route-map/lib/smart-route-map-renderer.ts
@@ -102,6 +102,43 @@ export interface SmartRouteSegmentData {
       value: number;
       level: string;
       description: string;
+      factors?: {
+        weather?: {
+          temperature?: number;
+          visibility?: number;
+          wind?: number;
+          storms?: boolean;
+        };
+        delays?: {
+          avg30: number;
+          avg60: number;
+          avg90: number;
+          delayFreq: number;
+        };
+        cancellations?: {
+          rate30: number;
+          rate60: number;
+          rate90: number;
+          total: number;
+        };
+        occupancy?: {
+          avg: number;
+          highLoadPercent: number;
+        };
+        seasonality?: {
+          month: number;
+          riskFactor: number;
+        };
+        schedule?: {
+          regularityScore: number;
+        };
+      };
+    };
+    warnings?: string[];
+    validation?: {
+      isValid: boolean;
+      errors: string[];
+      warnings: string[];
     };
   };
 }
diff --git a/frontend/src/modules/routes/lib/smart-route-adapter.ts b/frontend/src/modules/routes/lib/smart-route-adapter.ts
index eb74cfb..2d653fa 100644
--- a/frontend/src/modules/routes/lib/smart-route-adapter.ts
+++ b/frontend/src/modules/routes/lib/smart-route-adapter.ts
@@ -101,6 +101,44 @@ export interface BackendSmartRoute {
       value: number;
       level: string;
       description: string;
+      factors?: {
+        weather?: {
+          temperature?: number;
+          visibility?: number;
+          wind?: number;
+          storms?: boolean;
+        };
+        delays?: {
+          avg30: number;
+          avg60: number;
+          avg90: number;
+          delayFreq: number;
+        };
+        cancellations?: {
+          rate30: number;
+          rate60: number;
+          rate90: number;
+          total: number;
+        };
+        occupancy?: {
+          avg: number;
+          highLoadPercent: number;
+        };
+        seasonality?: {
+          month: number;
+          riskFactor: number;
+        };
+        schedule?: {
+          regularityScore: number;
+        };
+      };
+    };
+    // ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╨╕ ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░
+    warnings?: string[];
+    validation?: {
+      isValid: boolean;
+      errors: string[];
+      warnings: string[];
     };
   }>;
   // ╨д╨Р╨Ч╨Р 4: Backend ╨╝╨╛╨╢╨╡╤В ╨╛╤В╨┤╨░╨▓╨░╤В╤М riskScore ╨┤╨╗╤П ╨▓╤Б╨╡╨│╨╛ ╨╝╨░╤А╤И╤А╤Г╤В╨░ (╨╝╨░╨║╤Б╨╕╨╝╤Г╨╝ ╤Б╤А╨╡╨┤╨╕ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨╛╨▓)
diff --git a/frontend/src/modules/routes/utils/smart-route-to-built-route-adapter.ts b/frontend/src/modules/routes/utils/smart-route-to-built-route-adapter.ts
index 276a467..80f3484 100644
--- a/frontend/src/modules/routes/utils/smart-route-to-built-route-adapter.ts
+++ b/frontend/src/modules/routes/utils/smart-route-to-built-route-adapter.ts
@@ -90,8 +90,47 @@ export interface SmartRouteSegment {
       end?: string
     }
   }
-  // ╨д╨Р╨Ч╨Р 4: Backend ╨╝╨╛╨╢╨╡╤В ╨╛╤В╨┤╨░╨▓╨░╤В╤М riskScore ╨┤╨╗╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░
-  riskScore?: IRiskScore
+  // ╨д╨Р╨Ч╨Р 4: Backend ╨╝╨╛╨╢╨╡╤В ╨╛╤В╨┤╨░╨▓╨░╤В╤М riskScore ╨┤╨╗╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ (╨▓╨║╨╗╤О╤З╨░╤П factors)
+  riskScore?: IRiskScore & {
+    factors?: {
+      weather?: {
+        temperature?: number;
+        visibility?: number;
+        wind?: number;
+        storms?: boolean;
+      };
+      delays?: {
+        avg30: number;
+        avg60: number;
+        avg90: number;
+        delayFreq: number;
+      };
+      cancellations?: {
+        rate30: number;
+        rate60: number;
+        rate90: number;
+        total: number;
+      };
+      occupancy?: {
+        avg: number;
+        highLoadPercent: number;
+      };
+      seasonality?: {
+        month: number;
+        riskFactor: number;
+      };
+      schedule?: {
+        regularityScore: number;
+      };
+    };
+  };
+  // ╨Я╤А╨╡╨┤╤Г╨┐╤А╨╡╨╢╨┤╨╡╨╜╨╕╤П ╨╕ ╨▓╨░╨╗╨╕╨┤╨░╤Ж╨╕╤П ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░
+  warnings?: string[];
+  validation?: {
+    isValid: boolean;
+    errors: string[];
+    warnings: string[];
+  };
 }
 
 export interface SmartRoute {
@@ -599,8 +638,11 @@ export function adaptSmartRouteToIBuiltRoute(
         priceData: {
           display: priceDisplay,
         },
-        // ╨д╨Р╨Ч╨Р 4: ╨Ф╨╛╨▒╨░╨▓╨╗╤П╨╡╨╝ riskScore ╨╕╨╖ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░
+        // ╨д╨Р╨Ч╨Р 4: ╨Ф╨╛╨▒╨░╨▓╨╗╤П╨╡╨╝ riskScore ╨╕╨╖ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░ (╨▓╨║╨╗╤О╤З╨░╤П factors)
         riskScore: segment.riskScore,
+        // ╨Ф╨╛╨▒╨░╨▓╨╗╤П╨╡╨╝ warnings ╨╕ validation ╨╕╨╖ ╤Б╨╡╨│╨╝╨╡╨╜╤В╨░
+        warnings: (segment as any).warnings,
+        segmentValidation: (segment as any).validation,
       } as IRouteSegmentDetails & {
       viaHubs?: Array<{ level: 'federal' | 'regional' }>
       pathGeometry?: Array<[number, number]>
@@ -750,7 +792,11 @@ export function adaptSmartRouteToIBuiltRoute(
   // ╨Ъ╨а╨Ш╨в╨Ш╨з╨Х╨б╨Ъ╨Ш╨Щ ╨д╨Ш╨Ъ╨б: ╨Ю╨▒╨╛╤А╨░╤З╨╕╨▓╨░╨╡╨╝ ╤Б╨╛╨╖╨┤╨░╨╜╨╕╨╡ ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В╨░ ╨▓ try-catch ╨┤╨╗╤П ╨┐╤А╨╡╨┤╨╛╤В╨▓╤А╨░╤Й╨╡╨╜╨╕╤П ╨┐╨░╨┤╨╡╨╜╨╕╤П
   try {
     const result: IBuiltRoute & {
-      validation?: SmartRoute['validation']
+      validation?: SmartRoute['validation'] | {
+        isValid: boolean;
+        errors: string[];
+        warnings: string[];
+      }
       totalDistance?: number
       totalDurationData?: { display: string }
       totalPriceData?: { display: string }
@@ -779,11 +825,17 @@ export function adaptSmartRouteToIBuiltRoute(
       totalDurationData: {
         display: totalDurationDisplay,
       },
-      totalPriceData: {
-        display: totalPriceDisplay,
-      },
-      // ╨д╨Р╨Ч╨Р 4: ╨Ф╨╛╨▒╨░╨▓╨╗╤П╨╡╨╝ riskAssessment ╨╕╨╖ riskScore ╨╝╨░╤А╤И╤А╤Г╤В╨░
-      riskAssessment: smartRoute.riskScore ? {
+              totalPriceData: {
+                display: totalPriceDisplay,
+              },
+              // ╨Ф╨╛╨▒╨░╨▓╨╗╤П╨╡╨╝ validation ╨╕╨╖ SmartRoute
+              validation: smartRoute.validation ? {
+                isValid: smartRoute.validation.isValid,
+                errors: smartRoute.validation.errors || [],
+                warnings: smartRoute.validation.warnings || [],
+              } : undefined,
+              // ╨д╨Р╨Ч╨Р 4: ╨Ф╨╛╨▒╨░╨▓╨╗╤П╨╡╨╝ riskAssessment ╨╕╨╖ riskScore ╨╝╨░╤А╤И╤А╤Г╤В╨░
+              riskAssessment: smartRoute.riskScore ? {
         routeId: smartRoute.id || `route-${Date.now()}`,
         riskScore: smartRoute.riskScore,
         factors: {
