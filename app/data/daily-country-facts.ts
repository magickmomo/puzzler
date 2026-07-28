import { CAPITAL_MATCH_PAIRS } from "./capitals";
import { COUNTRIES, type Country } from "./countries";

export type DailyCountryFacts = {
  continent: string;
  region: string;
  populationBand: string;
  language: string;
  geography: string;
  capital: string;
};

const FACT_DICTIONARIES = [
  ["Asia","Europe","Africa","Americas","Oceania"],
  ["Southern Asia","Southeast Europe","Northern Africa","Southern Europe","Middle Africa","Caribbean","South America","Western Asia","Australia and New Zealand","Central Europe","Eastern Europe","Western Europe","Central America","Western Africa","Southern Africa","South-Eastern Asia","Eastern Africa","North America","Eastern Asia","Northern Europe","Melanesia","Central Asia","Micronesia","Polynesia"],
  ["10–50 million people","1–10 million people","Under 1 million people","100 million or more people","50–100 million people"],
  ["Dari","Albanian","Arabic","Catalan","Portuguese","English","Guaraní","Armenian","Austro-Bavarian German","Azerbaijani","Bengali","Belarusian","German","Belizean Creole","French","Dzongkha","Aymara","Bosnian","Malay","Bulgarian","Khmer","Spanish","Chinese","Croatian","Greek","Czech","Danish","Estonian","Amharic","Finnish","Georgian","Hungarian","Icelandic","Indonesian","Persian (Farsi)","Italian","Japanese","Kazakh","Korean","Kyrgyz","Lao","Latvian","Lithuanian","Maldivian","Moldavian","Mongolian","Montenegrin","Burmese","Afrikaans","Nepali","Dutch","Macedonian","Norwegian Nynorsk","Polish","Romanian","Russian","Serbian","Seychellois Creole","Slovak","Slovene","Sinhala","Swedish","Thai","Turkish","Ukrainian","Bislama","Vietnamese","Chibarwe"],
  ["Landlocked; shares borders with 6 countries","Has a coastline and shares land borders with 4 countries","Has a coastline and shares land borders with 7 countries","Landlocked; shares borders with 2 countries","Has a coastline and no land borders","Has a coastline and shares land borders with 5 countries","Landlocked; shares borders with 4 countries","Landlocked; shares borders with 8 countries","Landlocked; shares borders with 5 countries","Has a coastline and shares land borders with 2 countries","Has a coastline and shares land borders with 3 countries","Has a coastline and shares land borders with 10 countries","Has a coastline and shares land borders with 1 country","Landlocked; shares borders with 3 countries","Has a coastline and shares land borders with 6 countries","Has a coastline and shares land borders with 16 countries","Has a coastline and shares land borders with 9 countries","Has a coastline and shares a land border with 1 country","Has a coastline and shares land borders with 8 countries","Landlocked; shares borders with 7 countries","Landlocked; shares borders with 1 country","Has a coastline and shares land borders with 14 countries"],
] as const;

// Code plus base-36 indexes into the dictionaries above. The compact local
// representation keeps all daily clues available offline without a network
// request, while making full-country coverage practical to maintain.
const FACT_ROWS = "af,0,0,0,0,0;al,1,1,1,1,1;dz,2,2,0,2,2;ad,1,3,2,3,3;ao,2,4,0,4,1;ag,3,5,2,5,4;ar,3,6,0,6,5;am,0,7,1,7,6;au,4,8,0,5,4;at,1,9,1,8,7;az,0,7,0,9,8;bs,3,5,2,5,4;bh,0,7,1,2,4;bd,0,0,3,a,9;bb,3,5,2,5,4;by,1,a,1,b,8;be,1,b,0,c,1;bz,3,c,2,d,9;bj,2,d,0,e,1;bt,0,0,2,f,3;bo,3,6,0,g,8;ba,1,1,1,h,a;bw,2,e,1,5,6;br,3,6,3,4,b;bn,0,f,2,i,c;bg,1,1,1,j,5;bf,2,d,0,e,0;bi,2,g,0,e,d;cv,2,d,2,4,4;kh,0,f,0,k,a;cm,2,4,0,5,e;ca,3,h,0,5,c;cf,2,4,1,e,0;td,2,4,0,2,0;cl,3,6,0,l,a;cn,0,i,3,m,f;co,3,6,4,l,5;km,2,g,2,2,4;cg,2,4,1,e,5;cd,2,4,3,e,g;cr,3,c,1,l,9;ci,2,d,0,e,5;hr,1,1,1,n,5;cu,3,5,0,l,4;cy,1,3,1,o,4;cz,1,9,0,p,6;dk,1,j,1,q,c;dj,2,g,1,2,a;dm,3,5,2,5,4;do,3,5,0,l,c;ec,3,6,0,l,9;eg,2,2,3,2,1;sv,3,c,1,l,9;gb-eng,1,j,4,5,h;gq,2,4,1,e,9;er,2,g,1,2,a;ee,1,j,1,r,9;sz,2,e,1,5,3;et,2,g,3,s,0;fj,4,k,2,5,4;fi,1,j,1,t,a;fr,1,b,4,e,i;ga,2,4,1,e,a;gm,2,d,1,5,c;ge,0,7,1,u,1;de,1,b,4,c,g;gh,2,d,0,5,a;gr,1,3,0,o,1;gd,3,5,2,5,4;gt,3,c,0,l,1;gn,2,d,0,e,e;gw,2,d,1,4,9;gy,3,6,2,5,a;ht,3,5,0,e,c;hn,3,c,0,l,a;hu,1,9,1,v,j;is,1,j,2,w,4;in,0,0,3,5,e;id,0,f,3,x,a;ir,0,0,4,y,2;iq,0,7,0,2,e;ie,1,j,1,5,c;il,0,7,0,2,5;it,1,3,4,z,e;jm,3,5,1,5,4;jp,0,i,3,10,4;jo,0,7,0,2,5;kz,0,l,0,11,8;ke,2,g,4,5,5;ki,4,m,2,5,4;kp,0,i,0,12,a;kr,0,i,4,12,c;kw,0,7,1,2,9;kg,0,l,1,13,6;la,0,f,1,14,8;lv,1,j,1,15,1;lb,0,7,1,2,9;ls,2,e,1,5,k;lr,2,d,1,5,a;ly,2,2,1,2,e;li,1,b,2,c,3;lt,1,j,1,16,1;lu,1,b,2,c,d;mg,2,g,0,e,4;mw,2,g,0,5,d;my,0,f,0,5,a;mv,0,0,2,17,4;ml,2,d,0,e,j;mt,1,3,2,5,4;mh,4,m,2,5,4;mr,2,d,1,2,1;mu,2,g,1,5,4;mx,3,h,3,l,a;fm,4,m,2,5,4;md,1,a,1,18,3;mc,1,b,2,e,c;mn,0,i,1,19,3;me,1,1,2,1a,5;ma,2,2,0,2,a;mz,2,g,0,4,e;mm,0,f,4,1b,5;na,2,e,1,1c,1;nr,4,m,2,5,4;np,0,0,0,1d,3;nl,1,b,0,1e,9;nz,4,8,1,5,4;ni,3,c,1,l,9;ne,2,d,0,e,j;ng,2,d,3,5,1;mk,1,1,1,1f,8;gb-nir,1,j,1,5,h;no,1,j,1,1g,a;om,0,7,1,2,a;pk,0,0,3,5,1;pw,4,m,2,5,4;pa,3,c,1,l,9;pg,4,k,0,5,c;py,3,6,1,6,d;pe,3,6,0,g,5;ph,0,f,3,5,4;pl,1,9,0,1h,2;pt,1,3,0,4,c;qa,0,7,1,2,c;ro,1,1,0,1i,5;ru,1,a,3,1j,l;rw,2,g,0,5,6;kn,3,5,2,5,4;lc,3,5,2,5,4;vc,3,5,2,5,4;ws,4,n,2,5,4;sm,1,3,2,z,k;st,2,4,2,4,4;sa,0,7,0,2,2;gb-sct,1,j,1,5,4;sn,2,d,0,e,5;rs,1,1,1,1k,7;sc,2,g,2,1l,4;sl,2,d,1,5,9;sg,0,f,1,5,4;sk,1,9,1,1m,8;si,1,9,1,1n,1;sb,4,k,2,5,4;so,2,g,0,2,a;za,2,e,4,1c,e;ss,2,4,0,5,0;es,1,3,0,l,5;lk,0,0,0,1o,c;sd,2,2,4,2,2;sr,3,6,2,1e,a;se,1,j,0,1p,9;ch,1,b,1,e,8;sy,0,7,0,2,5;tj,0,l,0,1j,6;tz,2,g,4,5,i;th,0,f,4,1q,1;tl,0,f,1,4,c;tg,2,d,1,e,a;to,4,n,2,5,4;tt,3,5,1,5,4;tn,2,2,0,2,9;tr,0,7,4,1r,i;tm,0,l,1,1j,6;tv,4,n,2,5,4;ug,2,g,4,5,8;ua,1,a,0,1s,2;ae,0,7,0,2,9;gb,1,j,4,5,c;us,3,h,3,5,9;uy,3,6,1,l,9;uz,0,l,0,1j,8;vu,4,k,2,1t,4;va,1,3,2,z,k;ve,3,6,0,l,a;gb-wls,1,j,1,5,4;vn,0,f,3,1u,a;ye,0,7,0,2,9;zm,2,g,0,5,7;zw,2,g,0,1v,6;ps,0,7,1,2,a";

const CAPITALS_BY_COUNTRY_CODE = new Map(CAPITAL_MATCH_PAIRS.map((country) => [country.code, country.capital]));

const decodedFacts = Object.fromEntries(FACT_ROWS.split(";").map((row) => {
  const [code, continentIndex, regionIndex, populationIndex, languageIndex, geographyIndex] = row.split(",");
  return [code, {
    continent: FACT_DICTIONARIES[0][Number.parseInt(continentIndex, 36)],
    region: FACT_DICTIONARIES[1][Number.parseInt(regionIndex, 36)],
    populationBand: FACT_DICTIONARIES[2][Number.parseInt(populationIndex, 36)],
    language: FACT_DICTIONARIES[3][Number.parseInt(languageIndex, 36)],
    geography: FACT_DICTIONARIES[4][Number.parseInt(geographyIndex, 36)],
    capital: CAPITALS_BY_COUNTRY_CODE.get(code),
  }];
})) as Record<string, DailyCountryFacts>;

for (const country of COUNTRIES) {
  if (!decodedFacts[country.code] || !decodedFacts[country.code].capital) {
    throw new Error("Missing daily challenge facts for " + country.name + ".");
  }
}

export function getDailyCountryFacts(country: Country): DailyCountryFacts {
  return decodedFacts[country.code];
}
