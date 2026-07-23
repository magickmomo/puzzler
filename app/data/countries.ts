export type Country = {
  code: string;
  name: string;
  aliases: readonly string[];
};

type CountryRecord = readonly [code: string, name: string, aliases?: readonly string[]];

// 193 United Nations member states, plus the Holy See, the State of Palestine, and four UK home nations.
const COUNTRY_DATA: readonly CountryRecord[] = [
  ["af", "Afghanistan"], ["al", "Albania"], ["dz", "Algeria"], ["ad", "Andorra"], ["ao", "Angola"],
  ["ag", "Antigua and Barbuda"], ["ar", "Argentina"], ["am", "Armenia"], ["au", "Australia"], ["at", "Austria"],
  ["az", "Azerbaijan"], ["bs", "Bahamas", ["The Bahamas"]], ["bh", "Bahrain"], ["bd", "Bangladesh"], ["bb", "Barbados"],
  ["by", "Belarus"], ["be", "Belgium"], ["bz", "Belize"], ["bj", "Benin"], ["bt", "Bhutan"],
  ["bo", "Bolivia", ["Bolivia, Plurinational State of"]], ["ba", "Bosnia and Herzegovina"], ["bw", "Botswana"], ["br", "Brazil"], ["bn", "Brunei", ["Brunei Darussalam"]],
  ["bg", "Bulgaria"], ["bf", "Burkina Faso"], ["bi", "Burundi"], ["cv", "Cabo Verde", ["Cape Verde"]], ["kh", "Cambodia"],
  ["cm", "Cameroon"], ["ca", "Canada"], ["cf", "Central African Republic"], ["td", "Chad"], ["cl", "Chile"],
  ["cn", "China"], ["co", "Colombia"], ["km", "Comoros"], ["cg", "Republic of the Congo", ["Congo", "Congo-Brazzaville"]], ["cd", "Democratic Republic of the Congo", ["DR Congo", "Congo-Kinshasa"]],
  ["cr", "Costa Rica"], ["ci", "Côte d'Ivoire", ["Cote d'Ivoire", "Ivory Coast"]], ["hr", "Croatia"], ["cu", "Cuba"], ["cy", "Cyprus"],
  ["cz", "Czechia", ["Czech Republic"]], ["dk", "Denmark"], ["dj", "Djibouti"], ["dm", "Dominica"], ["do", "Dominican Republic"],
  ["ec", "Ecuador"], ["eg", "Egypt"], ["sv", "El Salvador"], ["gb-eng", "England"], ["gq", "Equatorial Guinea"], ["er", "Eritrea"],
  ["ee", "Estonia"], ["sz", "Eswatini", ["Swaziland"]], ["et", "Ethiopia"], ["fj", "Fiji"], ["fi", "Finland"],
  ["fr", "France"], ["ga", "Gabon"], ["gm", "Gambia", ["The Gambia"]], ["ge", "Georgia"], ["de", "Germany"],
  ["gh", "Ghana"], ["gr", "Greece"], ["gd", "Grenada"], ["gt", "Guatemala"], ["gn", "Guinea"],
  ["gw", "Guinea-Bissau"], ["gy", "Guyana"], ["ht", "Haiti"], ["hn", "Honduras"], ["hu", "Hungary"],
  ["is", "Iceland"], ["in", "India"], ["id", "Indonesia"], ["ir", "Iran", ["Islamic Republic of Iran"]], ["iq", "Iraq"],
  ["ie", "Ireland"], ["il", "Israel"], ["it", "Italy"], ["jm", "Jamaica"], ["jp", "Japan"],
  ["jo", "Jordan"], ["kz", "Kazakhstan"], ["ke", "Kenya"], ["ki", "Kiribati"], ["kp", "North Korea", ["Democratic People's Republic of Korea", "DPRK"]],
  ["kr", "South Korea", ["Republic of Korea", "Korea"]], ["kw", "Kuwait"], ["kg", "Kyrgyzstan"], ["la", "Laos", ["Lao People's Democratic Republic"]], ["lv", "Latvia"],
  ["lb", "Lebanon"], ["ls", "Lesotho"], ["lr", "Liberia"], ["ly", "Libya"], ["li", "Liechtenstein"],
  ["lt", "Lithuania"], ["lu", "Luxembourg"], ["mg", "Madagascar"], ["mw", "Malawi"], ["my", "Malaysia"],
  ["mv", "Maldives"], ["ml", "Mali"], ["mt", "Malta"], ["mh", "Marshall Islands"], ["mr", "Mauritania"],
  ["mu", "Mauritius"], ["mx", "Mexico"], ["fm", "Micronesia", ["Federated States of Micronesia"]], ["md", "Moldova", ["Republic of Moldova"]], ["mc", "Monaco"],
  ["mn", "Mongolia"], ["me", "Montenegro"], ["ma", "Morocco"], ["mz", "Mozambique"], ["mm", "Myanmar", ["Burma"]],
  ["na", "Namibia"], ["nr", "Nauru"], ["np", "Nepal"], ["nl", "Netherlands", ["Holland"]], ["nz", "New Zealand"],
  ["ni", "Nicaragua"], ["ne", "Niger"], ["ng", "Nigeria"], ["mk", "North Macedonia", ["Macedonia"]], ["gb-nir", "Northern Ireland"], ["no", "Norway"],
  ["om", "Oman"], ["pk", "Pakistan"], ["pw", "Palau"], ["pa", "Panama"], ["pg", "Papua New Guinea"],
  ["py", "Paraguay"], ["pe", "Peru"], ["ph", "Philippines", ["The Philippines"]], ["pl", "Poland"], ["pt", "Portugal"],
  ["qa", "Qatar"], ["ro", "Romania"], ["ru", "Russia", ["Russian Federation"]], ["rw", "Rwanda"], ["kn", "Saint Kitts and Nevis"],
  ["lc", "Saint Lucia"], ["vc", "Saint Vincent and the Grenadines"], ["ws", "Samoa"], ["sm", "San Marino"], ["st", "Sao Tome and Principe", ["São Tomé and Príncipe"]],
  ["sa", "Saudi Arabia"], ["gb-sct", "Scotland"], ["sn", "Senegal"], ["rs", "Serbia"], ["sc", "Seychelles"], ["sl", "Sierra Leone"],
  ["sg", "Singapore"], ["sk", "Slovakia"], ["si", "Slovenia"], ["sb", "Solomon Islands"], ["so", "Somalia"],
  ["za", "South Africa"], ["ss", "South Sudan"], ["es", "Spain"], ["lk", "Sri Lanka"], ["sd", "Sudan"],
  ["sr", "Suriname"], ["se", "Sweden"], ["ch", "Switzerland"], ["sy", "Syria", ["Syrian Arab Republic"]], ["tj", "Tajikistan"],
  ["tz", "Tanzania", ["United Republic of Tanzania"]], ["th", "Thailand"], ["tl", "Timor-Leste", ["East Timor"]], ["tg", "Togo"], ["to", "Tonga"],
  ["tt", "Trinidad and Tobago"], ["tn", "Tunisia"], ["tr", "Türkiye", ["Turkey"]], ["tm", "Turkmenistan"], ["tv", "Tuvalu"],
  ["ug", "Uganda"], ["ua", "Ukraine"], ["ae", "United Arab Emirates", ["UAE"]], ["gb", "United Kingdom", ["UK", "Great Britain"]], ["us", "United States", ["United States of America", "USA", "US"]],
  ["uy", "Uruguay"], ["uz", "Uzbekistan"], ["vu", "Vanuatu"], ["va", "Vatican City", ["Holy See", "Vatican"]], ["ve", "Venezuela", ["Venezuela, Bolivarian Republic of"]], ["gb-wls", "Wales"],
  ["vn", "Vietnam", ["Viet Nam"]], ["ye", "Yemen"], ["zm", "Zambia"], ["zw", "Zimbabwe"], ["ps", "Palestine", ["State of Palestine"]],
];

export const COUNTRIES: readonly Country[] = COUNTRY_DATA.map(([code, name, aliases = []]) => ({ code, name, aliases }));
