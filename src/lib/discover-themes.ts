import type { Language } from "./languages";

// Reading themes: hand-picked Wikipedia article titles, so Discover can offer places, culture and history without a
// search. Titles are checked against Wikipedia when shown, so a renamed or missing one simply drops off the list.

export type Theme = { id: string; label: string; blurb: string; titles: string[] };

export const THEMES: Record<Language, Theme[]> = {
  fa: [
    {
      id: "places",
      label: "Places in Iran",
      blurb: "Cities and regions, from Tehran to Yazd",
      titles: ["تهران", "اصفهان", "شیراز", "تبریز", "مشهد", "یزد", "کاشان", "کرمان", "رشت", "همدان", "اهواز", "بندرعباس", "کرمانشاه", "ارومیه", "قزوین", "گیلان", "خوزستان", "کردستان", "کیش", "دماوند"],
    },
    {
      id: "culture",
      label: "Culture",
      blurb: "Festivals, food, music and poets",
      titles: ["نوروز", "شب یلدا", "حافظ", "سعدی", "فردوسی", "مولوی", "عمر خیام", "شاهنامه", "موسیقی ایرانی", "فرش ایرانی", "آشپزی ایرانی", "چلوکباب", "زبان فارسی", "خط فارسی", "سینمای ایران"],
    },
    {
      id: "history",
      label: "History",
      blurb: "Empires, kings and landmarks",
      titles: ["هخامنشیان", "ساسانیان", "کوروش بزرگ", "داریوش یکم", "تخت جمشید", "پاسارگاد", "صفویان", "قاجار", "انقلاب مشروطه ایران", "جاده ابریشم", "ایران باستان", "نادرشاه", "کریم‌خان زند", "پارتیان"],
    },
  ],
  es: [
    {
      id: "places",
      label: "Places",
      blurb: "Cities and landscapes of the Spanish-speaking world",
      titles: ["Madrid", "Barcelona", "Sevilla", "Ciudad de México", "Buenos Aires", "Lima", "Bogotá", "Cuzco", "Machu Picchu", "Patagonia", "Andalucía", "Camino de Santiago", "La Habana", "Cartagena de Indias", "Islas Canarias", "Valparaíso"],
    },
    {
      id: "culture",
      label: "Culture",
      blurb: "Festivals, food, music and writers",
      titles: ["Día de Muertos", "Flamenco", "Tango", "Salsa (género musical)", "Tapas", "Paella", "Fiesta de San Fermín", "Quinceañera", "Gabriel García Márquez", "Frida Kahlo", "Miguel de Cervantes", "Gastronomía de México", "Cumbia", "Semana Santa"],
    },
    {
      id: "history",
      label: "History",
      blurb: "Empires, revolutions and landmarks",
      titles: ["Imperio azteca", "Imperio incaico", "Reconquista", "Guerra civil española", "Independencia de México", "Simón Bolívar", "Civilización maya", "Conquista de América", "Revolución mexicana", "Al-Ándalus", "Hernán Cortés", "José de San Martín"],
    },
  ],
};

export function themeById(language: Language, id: string): Theme | undefined {
  return THEMES[language].find((t) => t.id === id);
}
