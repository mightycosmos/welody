import { z } from "zod";
import { weatherConditions } from "@welody/shared";

const responseSchema = z.object({
  current: z.object({
    temperature_2m: z.number(),
    precipitation: z.number().optional(),
    weather_code: z.number(),
    cloud_cover: z.number().optional(),
    wind_speed_10m: z.number().optional(),
  }),
});

type WeatherResult = {
  temperatureCelsius: number;
  condition: (typeof weatherConditions)[number];
  precipitationMm: number;
  cloudCoverPercent?: number;
  windSpeedKmh?: number;
};

const conditionFromCode = (code: number): WeatherResult["condition"] => {
  if (code === 0 || code === 1) return "CLEAR";
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) return "SNOW";
  if (code >= 51 && code <= 82 || code >= 95) return "RAIN";
  if (code >= 2 && code <= 48) return "CLOUDY";
  return "CLEAR";
};

export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
  baseUrl = process.env.OPEN_METEO_BASE_URL ??
    "https://api.open-meteo.com/v1/forecast",
): Promise<WeatherResult> {
  const url = new URL(baseUrl);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,precipitation,weather_code,cloud_cover,wind_speed_10m",
  );
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) {
    throw new Error(`Open-Meteo returned HTTP ${response.status}`);
  }
  const payload = responseSchema.parse(await response.json());
  return {
    temperatureCelsius: payload.current.temperature_2m,
    condition: conditionFromCode(payload.current.weather_code),
    precipitationMm: payload.current.precipitation ?? 0,
    cloudCoverPercent: payload.current.cloud_cover,
    windSpeedKmh: payload.current.wind_speed_10m,
  };
}
