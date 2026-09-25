'use strict';

const REPO = 'https://github.com/victoriano/medios-virales';
const PAGE = 25;
const PARTIDOS = ['PSOE', 'PP', 'Vox', 'Sumar', 'varios', 'ninguno'];
const CHIP = { PP: 'pp', PSOE: 'psoe', Vox: 'vox', Sumar: 'sumar', varios: 'otros', ninguno: 'otros' };
const DIRCHIP = { beneficia: 'ben', perjudica: 'perj', neutro: 'neu' };

/* ---------- i18n ----------
   Diccionario único para castellano e inglés. Los valores son cadenas o
   funciones que devuelven cadenas: no hay JSON aparte ni framework. */
let LANG = 'es';
const I18N = {
  es: {
    title: 'Sesgo y viralidad de los medios españoles · victoriano.me',
    description: 'Mapa histórico de 602.906 tuits de 66 medios españoles entre 2018 y 2026: posición de lo publicado frente a lo viral.',
    ogTitle: 'Sesgo y viralidad de los medios españoles',
    ogDescription: '602.906 tuits de 66 medios entre 2018 y 2026, clasificados por partido y dirección, con comparación entre lo publicado y lo viral.',
    kicker: 'victoriano.me · análisis',
    headline: 'Sesgo y viralidad de los medios españoles',
    lede: (nVirales, nMedios) => `<strong id="n-virales">${nVirales}</strong> tuits muestreados de <strong id="n-medios">${nMedios}</strong> medios generalistas españoles entre 2018 y 2026, clasificados uno a uno para comparar lo que publican con lo que se hace viral.`,
    tabMapa: 'Mapa',
    tabRanking: 'Ranking',
    tabTop: 'Los más virales',
    tabMetodo: 'Método',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    themeSystem: 'Sistema',
    ariaLang: 'Idioma',
    ariaTheme: 'Tema',
    rankingTitle: 'Ranking de medios',
    searchPlaceholder: 'Buscar medio…',
    rankingHint: 'Solo aparecen medios que se han significado a favor o en contra en más de 50 tuits durante toda la muestra. <strong>De cada 10 con lado claro</strong> indica cuántos van a la izquierda y cuántos a la derecha. <strong>% políticos</strong> muestra qué parte de todos los tuits muestreados fue clasificada como política. Pulsa una fila para leer sus tuits.',
    colMedio: 'Medio',
    colDecimos: 'De cada 10 con lado claro',
    colIndice: 'Índice',
    colVirales: 'Virales',
    colPoliticos: 'Políticos',
    colIzq: 'Izq.',
    colDer: 'Der.',
    colPctPol: '% políticos',
    rankAviso: 'El corte de inclusión usa únicamente los tuits con lado claro: izquierda más derecha debe superar 50. El porcentaje político usa todos los tuits clasificados como políticos, incluidos los que informan sin tomar partido.',
    rankNoteTemplate: (n, desde, hasta) => `${n} medios incluidos: cada uno se ha significado a favor o en contra más de 50 veces en toda la muestra. Periodo del ${desde} al ${hasta}.`,
    noMatchRanking: 'Ningún medio coincide con esa búsqueda.',
    seguidores: 'seguidores',
    cardMuestreados: 'Tuits muestreados',
    cardVirales: 'virales',
    cardMedios: 'medios',
    cardPoliticos: 'Con lectura política',
    cardPctTotal: '% del total',
    cardPartido: 'Partido más señalado',
    cardPctPoliticos: 'de los políticos',
    cardDireccion: 'Dirección',
    cardCritica: 'crítica',
    cardDirSub: 'dirección de los tuits políticos',
    tweets: 'tuits',
    tweetsConLectura: 'tuits con lectura',
    beneficia: 'beneficia',
    perjudica: 'perjudica',
    neutro: 'neutro',
    mapaTitle: 'Mapa de sesgo: lo que se publica y lo que se comparte',
    mapaPeriodoAll: 'Serie completa',
    mapaPeriodoXV: 'XV Legislatura',
    mapaSerieAmbas: 'Las dos posiciones',
    mapaSeriePub: 'Solo lo publicado',
    mapaSerieViral: 'Solo lo viral',
    mapaPlay: '▶ Evolución 2018 a 2026',
    mapaPause: (year) => `⏸ Pausar · ${year}`,
    ariaPlay: 'Reproducir o pausar la evolución anual del mapa',
    mapaFiltro5: 'Con muestra de 5 o más',
    mapaFiltro0: 'Todos los medios',
    mapaFiltro15: 'Con muestra de 15 o más',
    mapaFiltro30: 'Con muestra de 30 o más',
    mapaHint: 'Cada medio es un punto. En horizontal, su posición en la escala <strong>izquierda → derecha</strong>: 0 en el borde izquierdo es que todos sus tuits con lado claro van a la izquierda, 100 en el derecho es que van todos a la derecha, y 50 la mitad y mitad. El color sigue la convención española: <span class="rojo">rojo</span> a la izquierda, <span class="azul">azul</span> a la derecha y gris en el centro. La altura es el porcentaje de todos los tuits de la serie que tiene lado claro. El tamaño del punto es su media de retuits. El <strong>selector de periodo</strong> permite ver la serie completa, la XV Legislatura o un año. Cada ventana se basa en <strong>hasta 100 tuits Latest por medio y mes</strong>: <strong>Publicado</strong> son todos esos tuits y <strong>Viral</strong> es el subconjunto con al menos 100 retuits. En <strong>las dos posiciones</strong>, el aro continuo es lo publicado, el discontinuo lo viral y la flecha va del punto publicado al viral. Pasa el ratón para ver los números y pulsa para abrir sus tuits.',
    axisLeft: '◀ todo a la izquierda',
    axisMid: '% de los tuits con lado que va a la derecha',
    axisRight: 'todo a la derecha ▶',
    axisYTitle: (periodo) => `% de los tuits con posición clara · lo publicado frente a lo viral · ${periodo}`,
    zonaMuyIzq: 'muy a la izquierda',
    zonaIzq: 'a la izquierda',
    zonaEq: 'equilibrio',
    zonaDer: 'a la derecha',
    zonaMuyDer: 'muy a la derecha',
    ticMitad: 'mitad y mitad',
    ticDerechaN: (n) => n === 10 ? '10 de cada 10' : n === 0 ? '0' : `${n} de cada 10`,
    periodoTodo: 'serie completa',
    periodoXV: 'XV Legislatura',
    mapaPieTam: 'Tamaño',
    mapaPieAro: 'Aro',
    mapaPieIzq: 'izquierda',
    mapaPieDer: 'derecha',
    mapaPieCentro: 'centro',
    mapaPieAroContinuo: 'Aro continuo',
    mapaPiePublicado: 'lo publicado',
    mapaPieAroDiscontinuo: 'aro discontinuo',
    mapaPieLoViral: 'lo viral',
    mapaPieFlecha: 'Flecha',
    mapaPieFlechaDesc: 'de la posición publicada a la viral: hacia dónde se desplaza el medio al compartirse',
    mapaPieAltura: 'Altura',
    mapaPieAlturaDesc: 'porcentaje de tuits de cada serie que benefician o perjudican claramente a un partido.',
    mapaPieCorte: 'Corte de inclusión',
    mapaPieCorteDesc: 'más de 50 tuits significados a favor o en contra en toda la muestra.',
    mapaPieFiltroN: (n) => `Solo se dibujan los medios con ${n} o más tuits con lado claro en cada serie.`,
    mapaPieFiltro0: 'Se dibujan todos los medios con muestra en la serie elegida.',
    mapaPieFuera: (n) => `${n} ${n === 1 ? 'medio incluido queda fuera' : 'medios incluidos quedan fuera'} con este filtro de visualización.`,
    mapaPieFueraCorte: (n) => `${n} ${n === 1 ? 'medio queda fuera' : 'medios quedan fuera'} por no superar el corte de inclusión.`,
    mapaNoDatos: 'No se han podido cargar los datos de lo publicado frente a lo viral.',
    mapaResAmbas: (n) => `${n} medios con muestra en las dos series.`,
    mapaResDespSuLado: (n, total) => `${n} de ${total} se ${n === 1 ? 'desplaza' : 'desplazan'} hacia su propio lado al compartirse.`,
    mapaResMedianaCero: 'La mediana del desplazamiento es de cero puntos.',
    mapaResMediana: (pts, dir) => `La mediana del desplazamiento es de ${pts} puntos hacia la ${dir}.`,
    mapaResSolo: (n, serie) => `${n} medios dibujados con la muestra de lo ${serie}.`,
    publicado: 'publicado',
    viral: 'viral',
    izquierda: 'izquierda',
    derecha: 'derecha',
    tipPublicado: 'Publicado',
    tipViral: 'Viral',
    tipSinLado: 'sin tuits con lado claro',
    tipClaros: 'claros de',
    tipPoliticos: 'tuits políticos',
    tipMuestraCorta: 'muestra corta',
    tipPctSerie: '% de la serie con lado claro',
    tipDe: 'de',
    tipTuits: 'tuits',
    tipADerecha: '% a la derecha',
    tipSinLadoPct: '% sin lado',
    tipDesplazaQueda: 'Al compartirse se queda en el mismo sitio.',
    tipDesplaza: (pts, dir) => `Al compartirse se desplaza ${pts} puntos hacia la ${dir}.`,
    tipRtMedia: 'retuits de media',
    tipIndiceMuestra: 'índice de la muestra completa',
    backRanking: '← Volver al ranking',
    medioLoading: 'Cargando tuits…',
    medioError: 'No se han podido cargar sus tuits. Prueba otra vez.',
    medioMuestreados: 'tuits muestreados',
    medioVirales: 'virales',
    medioSearchPlaceholder: 'Buscar en sus tuits…',
    medioSortRt: 'Ordenar por retuits',
    medioSortLk: 'Ordenar por me gusta',
    medioSortVw: 'Ordenar por vistas',
    medioSortF: 'Ordenar por fecha',
    medioAllTweets: 'Todos los tuits',
    medioOnlyPol: 'Solo con partido',
    medioAllParty: 'Todo partido',
    medioAllDir: 'Toda dirección',
    medioNoMatch: 'Ningún tuit coincide con esos filtros.',
    loadMore: 'Cargar más',
    loadMoreN: (n) => `Cargar más (${n} restantes)`,
    kpiPoliticos: 'Con lectura política',
    kpiIzq: 'Favorecen a la izquierda',
    kpiDer: 'Favorecen a la derecha',
    kpiNeutro: 'Neutro',
    kpiRtMed: 'RT mediana',
    kpiRtMax: 'RT máxima',
    kpiNotaFiltros: (n) => `Cifras calculadas sobre los ${n} ${n === 1 ? 'tuit' : 'tuits'} que cumplen los filtros, no sobre el medio entero.`,
    tweetIronia: 'ironía',
    tweetRetuits: 'retuits',
    tweetMeGusta: 'me gusta',
    tweetVerX: 'Ver en X ↗',
    tweetConfianza: 'confianza',
    tweetIroniaDet: 'ironía detectada',
    topTitle: 'Los 300 tuits virales con lectura política',
    topHint: 'Ordenados por retuits. Cada tarjeta lleva el partido al que afecta y la dirección.',
    topAllParty: 'Todo partido',
    topAllDir: 'Toda dirección',
    topNoMatch: 'Nada que mostrar con esos filtros.',
    metodoTitle: 'Cómo se ha hecho',
    metodoQueMide: 'Qué se mide',
    metodoQueMideP: 'La posición política de una muestra de publicaciones en X y cómo cambia dentro del subconjunto que alcanza difusión viral. Para cada tuit se determina primero si tiene lectura política española. Cuando la tiene, se identifica el partido afectado y si el contenido lo beneficia, lo perjudica o informa sin tomar partido. El resultado describe la actividad observada en X, no la ideología definitiva de una redacción.',
    metodoUniverso: 'Universo y muestra',
    metodoUniversoItems: [
      (n) => `Universo inicial: <strong>${n} medios</strong> de la lista <em>Spanish Generalist Media</em> de X.`,
      (desde, hasta) => `Ventana combinada: del <strong>${desde} al ${hasta}</strong>. El periodo XV comienza el 17/08/2023.`,
      (n) => `Muestra: <strong>${n} tuits únicos</strong>. Se toman hasta 100 tuits por medio y mes, repartidos en cinco tramos temporales para evitar que toda la muestra proceda del final del mes.`,
      'Fuente: <strong>TwitterAPI.io</strong>, mediante consultas individuales por medio ordenadas por publicación reciente. Las fechas reales se comprueban después de descargar y cualquier resultado fuera de la ventana se descarta.',
      (n) => `El conjunto <strong>Viral</strong> es un subconjunto de esa misma muestra: <strong>${n} tuits con al menos 100 retuits</strong>. No es un censo independiente.`,
      (clasificacion, descarga) => `Costes combinados: <strong>${clasificacion} USD</strong> de clasificación y <strong>${descarga} USD</strong> de descarga.`,
    ],
    metodoClasif: 'Clasificación',
    metodoClasifP: (n) => `Los ${n} tuits fueron clasificados con Gemini 3.7 Flash. Los nombres de los partidos se normalizan a PSOE, PP, Vox y Sumar antes de calcular recuentos y filtros.`,
    metodoRevisionP: 'Después se revisaron contextualmente <strong>3.813 tuits</strong> que mencionaban a Aldama, González, García Page, Page o Alfonso Guerra. La revisión distingue la persona mencionada, su papel político en la fecha del tuit y el efecto final sobre el PSOE. Se aplicaron <strong>601 correcciones</strong>; los casos referidos a otras personas, con confianza baja o efecto incierto conservaron su clasificación anterior.',
    metodoGate: (clasificados, restantes) => `${clasificados} tuits políticos y ${restantes} sin lectura política`,
    metodoLectura: 'Lectura política:',
    metodoPartido: 'Partido afectado:',
    metodoDireccion: 'Dirección:',
    metodoQueEntran: 'Qué medios entran en el análisis',
    metodoQueEntranP1: 'El ranking y el mapa muestran únicamente los medios que se han significado a favor o en contra en <strong>más de 50 tuits durante toda la muestra</strong>. Para este corte se suman los tuits situados a la izquierda y a la derecha. Los tuits políticos que informan sin tomar partido no cuentan para alcanzar el umbral.',
    metodoQueEntranP2: (n, total) => `Superan el corte <strong>${n} de los ${total} medios</strong>. La selección se calcula una sola vez sobre toda la muestra y se mantiene al consultar cada año, para no cambiar arbitrariamente el universo comparado. En el mapa se exige además un mínimo de cinco tuits con lado claro en cada serie visible. Cuando se comparan Publicado y Viral, ambas series deben superar ese mínimo.`,
    metodoPct: 'Porcentaje de tuits políticos',
    metodoPctP: 'La columna <strong>% políticos</strong> del ranking se calcula como el número de tuits clasificados con lectura política dividido por todos los tuits muestreados del medio. Incluye tanto los tuits que toman partido como los que informan sobre política sin favorecer ni perjudicar a un lado.',
    metodoPosicion: 'Cómo se calcula la posición',
    metodoPosicionP1: 'Un tuit suma a la izquierda si beneficia a PSOE o Sumar, o si perjudica a PP o Vox. Suma a la derecha si beneficia a PP o Vox, o si perjudica a PSOE o Sumar. Los tuits políticos sin lado claro quedan fuera de este cálculo.',
    metodoPosicionP2: 'La posición del mapa es el porcentaje de tuits con lado claro que cae a la derecha. Cero significa que todos caen a la izquierda, cincuenta indica equilibrio y cien significa que todos caen a la derecha. El índice técnico del ranking expresa la misma relación en una escala de menos uno a más uno.',
    metodoLeerMapa: 'Cómo leer el mapa',
    metodoLeerMapaP: 'El aro continuo representa lo publicado y el aro discontinuo, el subconjunto viral. La flecha parte de la posición publicada y termina en la viral. Por tanto, muestra hacia dónde se desplaza el contenido del medio cuando se comparte más. La altura indica qué porcentaje de todos los tuits de cada serie tiene lado claro. El selector temporal permite ver la serie completa, la XV Legislatura o cada año natural, pero no altera el corte global de inclusión.',
    metodoLimites: 'Límites',
    metodoLimitesItems: [
      'Es una muestra estratificada de hasta 100 tuits por medio y mes, no el historial completo de cada cuenta.',
      'Solo se analiza el texto del tuit. No se interpretan el contenido de enlaces, imágenes o vídeos.',
      'La clasificación política y su dirección son juicios de un modelo y pueden contener errores.',
      'El subconjunto viral mide qué parte de la muestra recibió más retuits, no el alcance real ni la opinión completa de la audiencia.',
      'Las cuentas sin publicaciones recuperadas permanecen en el universo inicial, aunque no puedan superar el corte de inclusión.',
    ],
    metodoRepo: 'repositorio público en GitHub',
    metodoActualizado: 'Muestra actualizada el',
    metodoDatosScripts: 'Datos, scripts y este sitio:',
    metodoFuente: (fecha) => `Datos, scripts y este sitio: <a id="repo-link" href="${REPO}" target="_blank" rel="noopener">repositorio público en GitHub</a>. Muestra actualizada el ${fecha}.`,
    footerText: 'Análisis reproducible sobre datos públicos de X. Hecho para revisar, no para sentenciar.',
    decimosTxtIzq: 'izq',
    decimosTxtDer: 'der',
    decimosSinLado: 'sin tuits con lado claro',
    decimosPctIzq: '% izq',
    decimosPctDer: '% der',
    decimosPctSin: '% sin lado',
    decimosConLado: 'con lado claro',
    decimosMuestraCorta: 'menos de 15 tuits con lado claro: muestra insuficiente',
    idxTooltip: 'índice de sesgo: de −1 (todo a la izquierda) a +1 (todo a la derecha). Ordena la tabla por defecto',
    formatDate: (y, m, d) => `${d}/${m}/${y}`,
    compactMil: 'mil',
    compactM: 'M',
    decimalSep: ',',
    ariaPeriodo: 'Periodo de la serie histórica',
    ariaSerie: 'Qué posiciones se dibujan',
    ariaFiltro: 'Filtrar por tamaño de muestra',
    ariaSearch: 'Buscar medio',
    ariaMapDesc: 'Dispersión de medios por posición en la escala izquierda-derecha, con lo publicado y lo viral y una flecha hacia donde se desplaza cada medio al compartirse',
  },
  en: {
    title: 'Bias and virality of Spanish media · victoriano.me',
    description: 'Historical map of 602,906 tweets from 66 Spanish media outlets between 2018 and 2026: published position vs viral position.',
    ogTitle: 'Bias and virality of Spanish media',
    ogDescription: '602,906 tweets from 66 outlets between 2018 and 2026, classified by party and direction, comparing published and viral.',
    kicker: 'victoriano.me · analysis',
    headline: 'Bias and virality of Spanish media',
    lede: (nVirales, nMedios) => `<strong id="n-virales">${nVirales}</strong> sampled tweets from <strong id="n-medios">${nMedios}</strong> Spanish general-interest media between 2018 and 2026, classified one by one to compare what they publish with what goes viral.`,
    tabMapa: 'Map',
    tabRanking: 'Ranking',
    tabTop: 'Most viral',
    tabMetodo: 'Method',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    ariaLang: 'Language',
    ariaTheme: 'Theme',
    rankingTitle: 'Media ranking',
    searchPlaceholder: 'Search outlet…',
    rankingHint: 'Only outlets with more than 50 left- or right-leaning tweets over the entire sample appear. <strong>Out of every 10 with clear side</strong> shows how many go left vs right. <strong>% political</strong> shows what portion of all sampled tweets was classified as political. Click a row to read its tweets.',
    colMedio: 'Outlet',
    colDecimos: 'Out of every 10 with clear side',
    colIndice: 'Index',
    colVirales: 'Viral',
    colPoliticos: 'Political',
    colIzq: 'Left',
    colDer: 'Right',
    colPctPol: '% political',
    rankAviso: 'The inclusion threshold uses only tweets with a clear side: left plus right must exceed 50. The political percentage uses all tweets classified as political, including those that report without taking sides.',
    rankNoteTemplate: (n, desde, hasta) => `${n} outlets included: each has taken sides more than 50 times in the full sample. Period from ${desde} to ${hasta}.`,
    noMatchRanking: 'No outlet matches that search.',
    seguidores: 'followers',
    cardMuestreados: 'Sampled tweets',
    cardVirales: 'viral',
    cardMedios: 'outlets',
    cardPoliticos: 'With political reading',
    cardPctTotal: '% of total',
    cardPartido: 'Most mentioned party',
    cardPctPoliticos: 'of political',
    cardDireccion: 'Direction',
    cardCritica: 'critical',
    cardDirSub: 'direction of political tweets',
    tweets: 'tweets',
    tweetsConLectura: 'tweets with reading',
    beneficia: 'benefits',
    perjudica: 'harms',
    neutro: 'neutral',
    mapaTitle: 'Bias map: what gets published vs what gets shared',
    mapaPeriodoAll: 'Full series',
    mapaPeriodoXV: 'XV Legislature',
    mapaSerieAmbas: 'Both positions',
    mapaSeriePub: 'Published only',
    mapaSerieViral: 'Viral only',
    mapaPlay: '▶ Evolution 2018 to 2026',
    mapaPause: (year) => `⏸ Pause · ${year}`,
    ariaPlay: 'Play or pause the yearly evolution of the map',
    mapaFiltro5: 'With sample of 5 or more',
    mapaFiltro0: 'All outlets',
    mapaFiltro15: 'With sample of 15 or more',
    mapaFiltro30: 'With sample of 30 or more',
    mapaHint: 'Each outlet is a dot. Horizontally, its position on the <strong>left → right</strong> scale: 0 at the left edge means all its tweets with a clear side go left, 100 at the right means all go right, and 50 is half and half. Color follows Spanish convention: <span class="rojo">red</span> for left, <span class="azul">blue</span> for right, and gray for center. Height is the percentage of all tweets in the series with a clear side. Dot size is average retweets. The <strong>period selector</strong> shows the full series, the XV Legislature, or one year. Each window uses <strong>up to 100 Latest tweets per outlet per month</strong>: <strong>Published</strong> is all those tweets and <strong>Viral</strong> is the subset with at least 100 retweets. In <strong>both positions</strong> mode, the solid ring is published, the dashed ring is viral, and the arrow goes from the published point to the viral one. Hover to see numbers and click to open its tweets.',
    axisLeft: '◀ all to the left',
    axisMid: '% of tweets with clear side going right',
    axisRight: 'all to the right ▶',
    axisYTitle: (periodo) => `% of tweets with clear position · published vs viral · ${periodo}`,
    zonaMuyIzq: 'far left',
    zonaIzq: 'left',
    zonaEq: 'balanced',
    zonaDer: 'right',
    zonaMuyDer: 'far right',
    ticMitad: 'half and half',
    ticDerechaN: (n) => n === 10 ? '10 out of 10' : n === 0 ? '0' : `${n} out of 10`,
    periodoTodo: 'full series',
    periodoXV: 'XV Legislature',
    mapaPieTam: 'Size',
    mapaPieAro: 'Ring',
    mapaPieIzq: 'left',
    mapaPieDer: 'right',
    mapaPieCentro: 'center',
    mapaPieAroContinuo: 'Solid ring',
    mapaPiePublicado: 'published',
    mapaPieAroDiscontinuo: 'dashed ring',
    mapaPieLoViral: 'viral',
    mapaPieFlecha: 'Arrow',
    mapaPieFlechaDesc: 'from published position to viral: where the outlet shifts when shared',
    mapaPieAltura: 'Height',
    mapaPieAlturaDesc: 'percentage of tweets in each series that clearly benefit or harm a party.',
    mapaPieCorte: 'Inclusion threshold',
    mapaPieCorteDesc: 'more than 50 tweets taking sides in the full sample.',
    mapaPieFiltroN: (n) => `Only outlets with ${n} or more tweets with clear side in each series are drawn.`,
    mapaPieFiltro0: 'All outlets with sample in the chosen series are drawn.',
    mapaPieFuera: (n) => `${n} included outlet${n === 1 ? ' is' : 's are'} filtered out with this display filter.`,
    mapaPieFueraCorte: (n) => `${n} outlet${n === 1 ? '' : 's'} fall${n === 1 ? 's' : ''} below the inclusion threshold.`,
    mapaNoDatos: 'Could not load data for published vs viral.',
    mapaResAmbas: (n) => `${n} outlets with sample in both series.`,
    mapaResDespSuLado: (n, total) => `${n} out of ${total} shift${n === 1 ? 's' : ''} toward their own side when shared.`,
    mapaResMedianaCero: 'The median shift is zero points.',
    mapaResMediana: (pts, dir) => `The median shift is ${pts} points toward the ${dir}.`,
    mapaResSolo: (n, serie) => `${n} outlets drawn with the ${serie} sample.`,
    publicado: 'published',
    viral: 'viral',
    izquierda: 'left',
    derecha: 'right',
    tipPublicado: 'Published',
    tipViral: 'Viral',
    tipSinLado: 'no tweets with clear side',
    tipClaros: 'clear of',
    tipPoliticos: 'political tweets',
    tipMuestraCorta: 'short sample',
    tipPctSerie: '% of series with clear side',
    tipDe: 'of',
    tipTuits: 'tweets',
    tipADerecha: '% to the right',
    tipSinLadoPct: '% neutral',
    tipDesplazaQueda: 'Stays in the same place when shared.',
    tipDesplaza: (pts, dir) => `Shifts ${pts} points toward the ${dir} when shared.`,
    tipRtMedia: 'average retweets',
    tipIndiceMuestra: 'full sample index',
    backRanking: '← Back to ranking',
    medioLoading: 'Loading tweets…',
    medioError: 'Could not load its tweets. Please try again.',
    medioMuestreados: 'sampled tweets',
    medioVirales: 'viral',
    medioSearchPlaceholder: 'Search its tweets…',
    medioSortRt: 'Sort by retweets',
    medioSortLk: 'Sort by likes',
    medioSortVw: 'Sort by views',
    medioSortF: 'Sort by date',
    medioAllTweets: 'All tweets',
    medioOnlyPol: 'Only with party',
    medioAllParty: 'All parties',
    medioAllDir: 'All directions',
    medioNoMatch: 'No tweet matches those filters.',
    loadMore: 'Load more',
    loadMoreN: (n) => `Load more (${n} remaining)`,
    kpiPoliticos: 'With political reading',
    kpiIzq: 'Favor the left',
    kpiDer: 'Favor the right',
    kpiNeutro: 'Neutral',
    kpiRtMed: 'RT median',
    kpiRtMax: 'RT max',
    kpiNotaFiltros: (n) => `Figures calculated on the ${n} tweet${n === 1 ? '' : 's'} matching filters, not the full outlet.`,
    tweetIronia: 'irony',
    tweetRetuits: 'retweets',
    tweetMeGusta: 'likes',
    tweetVerX: 'View on X ↗',
    tweetConfianza: 'confidence',
    tweetIroniaDet: 'irony detected',
    topTitle: 'The 300 most viral tweets with political reading',
    topHint: 'Sorted by retweets. Each card shows the affected party and direction.',
    topAllParty: 'All parties',
    topAllDir: 'All directions',
    topNoMatch: 'Nothing to show with those filters.',
    metodoTitle: 'How it was done',
    metodoQueMide: 'What is measured',
    metodoQueMideP: 'The political position of a sample of X posts and how it changes within the subset that achieves viral reach. For each tweet, we first determine whether it has a Spanish political reading. When it does, we identify the affected party and whether the content benefits it, harms it, or reports without taking sides. The result describes activity observed on X, not the definitive ideology of a newsroom.',
    metodoUniverso: 'Universe and sample',
    metodoUniversoItems: [
      (n) => `Initial universe: <strong>${n} outlets</strong> from the <em>Spanish Generalist Media</em> list on X.`,
      (desde, hasta) => `Combined window: from <strong>${desde} to ${hasta}</strong>. The XV period starts on August 17, 2023.`,
      (n) => `Sample: <strong>${n} unique tweets</strong>. Up to 100 tweets per outlet per month are taken, spread across five time segments to prevent the entire sample from coming from the end of the month.`,
      'Source: <strong>TwitterAPI.io</strong>, via individual queries per outlet sorted by recent publication. Actual dates are checked after download and any results outside the window are discarded.',
      (n) => `The <strong>Viral</strong> set is a subset of that same sample: <strong>${n} tweets with at least 100 retweets</strong>. It is not a separate census.`,
      (classification, download) => `Combined costs: <strong>${classification} USD</strong> for classification and <strong>${download} USD</strong> for download.`,
    ],
    metodoClasif: 'Classification',
    metodoClasifP: (n) => `All ${n} tweets were classified with Gemini 3.7 Flash. Party names are normalized to PSOE, PP, Vox and Sumar before counts and filters are calculated.`,
    metodoRevisionP: 'A contextual review was then performed on <strong>3,813 tweets</strong> mentioning Aldama, González, García Page, Page or Alfonso Guerra. The review distinguishes the person mentioned, their political role on the tweet date and the final effect on PSOE. <strong>601 corrections</strong> were applied; cases referring to other people, with low confidence or uncertain effect kept their previous classification.',
    metodoGate: (clasificados, restantes) => `${clasificados} political tweets and ${restantes} without political reading`,
    metodoLectura: 'Political reading:',
    metodoPartido: 'Affected party:',
    metodoDireccion: 'Direction:',
    metodoQueEntran: 'Which outlets are included',
    metodoQueEntranP1: 'The ranking and map show only outlets that have taken sides in <strong>more than 50 tweets over the entire sample</strong>. For this threshold, left-leaning and right-leaning tweets are summed. Political tweets that report without taking sides do not count toward the threshold.',
    metodoQueEntranP2: (n, total) => `<strong>${n} of the ${total} outlets</strong> exceed the threshold. The selection is calculated once on the full sample and maintained when viewing each year, to avoid arbitrarily changing the compared universe. The map also requires at least five tweets with a clear side in each visible series. When comparing Published and Viral, both series must exceed that minimum.`,
    metodoPct: 'Political tweet percentage',
    metodoPctP: 'The <strong>% political</strong> column in the ranking is calculated as the number of tweets classified with political reading divided by all sampled tweets from the outlet. It includes both tweets that take sides and those that report on politics without favoring or harming a side.',
    metodoPosicion: 'How position is calculated',
    metodoPosicionP1: 'A tweet counts as left if it benefits PSOE or Sumar, or if it harms PP or Vox. It counts as right if it benefits PP or Vox, or if it harms PSOE or Sumar. Political tweets without a clear side are excluded from this calculation.',
    metodoPosicionP2: 'The map position is the percentage of tweets with a clear side that fall to the right. Zero means all fall to the left, fifty indicates balance, and one hundred means all fall to the right. The technical index in the ranking expresses the same relationship on a scale from minus one to plus one.',
    metodoLeerMapa: 'How to read the map',
    metodoLeerMapaP: 'The solid ring represents published and the dashed ring represents the viral subset. The arrow starts at the published position and ends at the viral position. Thus, it shows where the outlet\'s content shifts when shared more. Height indicates what percentage of all tweets in each series has a clear side. The time selector shows the full series, the XV Legislature, or each calendar year, but does not alter the global inclusion threshold.',
    metodoLimites: 'Limitations',
    metodoLimitesItems: [
      'It is a stratified sample of up to 100 tweets per outlet per month, not the complete history of each account.',
      'Only the tweet text is analyzed. The content of links, images, or videos is not interpreted.',
      'Political classification and direction are model judgments and may contain errors.',
      'The viral subset measures what part of the sample received more retweets, not actual reach or the full opinion of the audience.',
      'Accounts without recovered posts remain in the initial universe, even if they cannot exceed the inclusion threshold.',
    ],
    metodoRepo: 'public repository on GitHub',
    metodoActualizado: 'Sample updated on',
    metodoDatosScripts: 'Data, scripts and this site:',
    metodoFuente: (fecha) => `Data, scripts and this site: <a id="repo-link" href="${REPO}" target="_blank" rel="noopener">public repository on GitHub</a>. Sample updated on ${fecha}.`,
    footerText: 'Reproducible analysis on public X data. Made for review, not for judgment.',
    decimosTxtIzq: 'left',
    decimosTxtDer: 'right',
    decimosSinLado: 'no tweets with clear side',
    decimosPctIzq: '% left',
    decimosPctDer: '% right',
    decimosPctSin: '% neutral',
    decimosConLado: 'with clear side',
    decimosMuestraCorta: 'less than 15 tweets with clear side: insufficient sample',
    idxTooltip: 'bias index: from −1 (all left) to +1 (all right). Sorts table by default',
    formatDate: (y, m, d) => new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(`${y}-${m}-${d}T00:00:00Z`)),
    compactMil: 'K',
    compactM: 'M',
    decimalSep: '.',
    ariaPeriodo: 'Period of the historical series',
    ariaSerie: 'Which positions to draw',
    ariaFiltro: 'Filter by sample size',
    ariaSearch: 'Search outlet',
    ariaMapDesc: 'Media scatter by left-right position, with published and viral positions and an arrow showing where each outlet shifts when shared',
  }
};
const t = (key, ...args) => {
  const val = I18N[LANG][key];
  if (typeof val === 'function') return val(...args);
  if (val !== undefined) return val;
  return I18N.es[key] !== undefined ? I18N.es[key] : key;
};
const DIRTXT = () => ({ beneficia: t('beneficia'), perjudica: t('perjudica'), neutro: t('neutro') });

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = n => new Intl.NumberFormat(LANG === 'en' ? 'en-US' : 'es-ES').format(n || 0);
const money = n => new Intl.NumberFormat(LANG === 'en' ? 'en-US' : 'es-ES', {
  minimumFractionDigits: 5, maximumFractionDigits: 6
}).format(n || 0);
const esc = s => (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fecha = f => { if (!f) return ''; const [y, m, d] = f.split('-'); return t('formatDate', y, m, d); };
const compact = n => {
  n = n || 0;
  const sep = t('decimalSep');
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', sep) + ' ' + t('compactM');
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace('.', sep) + ' ' + t('compactMil');
  return nf(n);
};
const decsep = n => n.toFixed(1).replace('.', t('decimalSep'));

/* ---------- lecturas del reparto ----------
   claro  = tuits que señalan a un partido con lado (izq + der): el denominador de la web.
   politicos = todos los tuits con lectura política, incluidos los que informan sin lado. */
const CLARO_MIN = 15;
const SIGNIFICADOS_MIN = 50;

function decimos(m) {
  const claro = (m.izq || 0) + (m.der || 0);
  if (!claro) return { claro: 0, izqLado: true, nDom: 0, nMin: 0, lado: 'izq', texto: '' };
  const izqLado = (m.izq || 0) >= (m.der || 0);
  const min = Math.min(m.izq || 0, m.der || 0);
  const nMin = min === 0 ? 0 : Math.max(1, Math.min(9, Math.round(10 * min / claro)));
  const nDom = 10 - nMin;
  const lado = izqLado ? 'izq' : 'der';
  const ladoTxt = izqLado ? t('decimosTxtIzq') : t('decimosTxtDer');
  const minTxt = izqLado ? t('decimosTxtDer') : t('decimosTxtIzq');
  return { claro, izqLado, nDom, nMin, lado, texto: `${nDom} ${ladoTxt} · ${nMin} ${minTxt}` };
}
function reparto(m) {
  const p = m.politicos || 0;
  const izq = p ? Math.round(100 * (m.izq || 0) / p) : 0;
  const der = p ? Math.round(100 * (m.der || 0) / p) : 0;
  return { izq, der, sin: Math.max(0, 100 - izq - der) };
}
let INDEX = null;
let POL = null;
let VER = '';
const CACHE = new Map();

/* ---------- carga de datos ---------- */
function pedirJSON(url) {
  if (!CACHE.has(url)) {
    const p = fetch(url).then(r => {
      if (!r.ok) throw new Error(r.status + ' ' + url);
      return r.json();
    });
    p.catch(() => CACHE.delete(url));
    CACHE.set(url, p);
  }
  return CACHE.get(url);
}
const metaDe = h => INDEX.medios.find(m => m.handle.replace('@', '').toLowerCase() === String(h).replace('@', '').toLowerCase());
function prefetchMedio(meta) {
  if (!meta || !meta.archivo) return;
  if (navigator.connection && navigator.connection.saveData) return;
  pedirJSON('data/' + meta.archivo + VER).catch(() => {});
}

/* ---------- navegación ---------- */
const VIEWS = ['ranking', 'mapa', 'medio', 'top', 'metodo'];
const PERIODOS_VALIDOS = ['todo', 'xv', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];
let currentView = 'mapa';
function show(v) {
  currentView = v;
  if (v !== 'mapa') pararEvolucion();
  VIEWS.forEach(x => { $('#view-' + x).hidden = x !== v; });
  $$('.tab').forEach(el => el.classList.toggle('is-on', el.dataset.view === v));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$$('.tab').forEach(el => el.addEventListener('click', () => {
  const base = '#/' + el.dataset.view;
  location.hash = el.dataset.view === 'mapa' ? base + hashPeriodo() : base;
}));
window.addEventListener('hashchange', route);
function hashPeriodo() {
  return mapaPeriodo && mapaPeriodo !== 'todo' ? '?p=' + mapaPeriodo : '';
}
function leePeriodoDeUrl(cadena) {
  const partes = cadena.split('?');
  if (partes.length > 1) {
    const usp = new URLSearchParams(partes[1]);
    const p = usp.get('p');
    if (p && PERIODOS_VALIDOS.includes(p)) return p;
  }
  const q = new URLSearchParams(location.search);
  const qp = q.get('p');
  if (qp && PERIODOS_VALIDOS.includes(qp)) return qp;
  return null;
}
function route() {
  const bruto = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const ruta = bruto.split('?')[0];
  const desdeUrl = leePeriodoDeUrl(bruto);
  if (desdeUrl && desdeUrl !== mapaPeriodo) {
    mapaPeriodo = desdeUrl;
    const sel = $('#mapa-periodo');
    if (sel) sel.value = mapaPeriodo;
  }
  if (ruta.startsWith('medio/')) { openMedio(ruta.slice(6)); return; }
  if (ruta === 'ranking') { show('ranking'); pintarRanking(); return; }
  if (ruta === 'top') { show('top'); return; }
  if (ruta === 'metodo') { show('metodo'); return; }
  show('mapa'); renderMapa();
}

/* ---------- cabecera / método ---------- */
function pintarTotales() {
  const tot = INDEX.totales;
  const nVir = nf(tot.muestreados || tot.virales);
  const nMed = tot.medios;
  const lede = $('#lede');
  if (lede) lede.innerHTML = t('lede', nVir, nMed);
  $('#m-gate').textContent = t('metodoGate', nf(tot.clasificados), nf((tot.muestreados || 0) - tot.clasificados));
  $('#m-partido').textContent = PARTIDOS.filter(p => tot.por_partido[p]).map(p => `${p} ${nf(tot.por_partido[p])}`).join(' · ');
  const dirtxt = DIRTXT();
  $('#m-dir').textContent = Object.entries(tot.por_direccion).map(([k, v]) => `${dirtxt[k] || k} ${nf(v)}`).join(' · ');
  const incluidos = INDEX.medios.filter(m => (m.izq || 0) + (m.der || 0) > SIGNIFICADOS_MIN).length;
  $('#rank-note').textContent = t('rankNoteTemplate', incluidos, fecha(INDEX.ventana.desde), fecha(INDEX.ventana.hasta));

  // Método: lista de universo, párrafo de clasificación, párrafo de "qué entran", límites, fuente
  const universo = t('metodoUniversoItems');
  const desde = fecha(INDEX.ventana.desde), hasta = fecha(INDEX.ventana.hasta);
  const ul = $('#metodo-universo');
  if (ul) {
    ul.innerHTML = universo.map((it, i) => {
      let html;
      if (i === 0) html = it(tot.medios);
      else if (i === 1) html = it(desde, hasta);
      else if (i === 2) html = it(nf(tot.muestreados || tot.virales));
      else if (i === 3) html = it;
      else if (i === 4) html = it(nf(tot.virales));
      else if (i === 5) html = it(money(tot.coste_clasificacion_usd), money(tot.coste_descarga_usd));
      else html = String(it);
      return `<li>${html}</li>`;
    }).join('');
  }
  const clasifP = $('#metodo-clasif-p');
  if (clasifP) clasifP.textContent = t('metodoClasifP', nf(tot.muestreados || tot.virales));
  const queEntranP2 = $('#metodo-que-entran-p2');
  if (queEntranP2) queEntranP2.innerHTML = t('metodoQueEntranP2', incluidos, tot.medios);
  const limUl = $('#metodo-limites');
  if (limUl) limUl.innerHTML = t('metodoLimitesItems').map(x => `<li>${x}</li>`).join('');
  const fuente = $('#metodo-fuente');
  if (fuente) fuente.innerHTML = t('metodoFuente', INDEX.generado);
}

function pintarStats() {
  const tot = INDEX.totales;
  const dist = PARTIDOS.map(p => ({ p, v: tot.por_partido[p] || 0 })).filter(x => x.v);
  const totalP = dist.reduce((a, b) => a + b.v, 0);
  const dir = ['perjudica', 'neutro', 'beneficia'].map(d => ({ d, v: tot.por_direccion[d] || 0 }));
  const totalD = dir.reduce((a, b) => a + b.v, 0);
  const color = { PP: 'var(--pp)', PSOE: 'var(--psoe)', Vox: 'var(--vox)', Sumar: 'var(--sumar)', varios: 'var(--otros)', ninguno: 'var(--otros)' };
  const cdir = { perjudica: 'var(--perj)', neutro: 'var(--neu)', beneficia: 'var(--ben)' };
  const dirtxt = DIRTXT();

  $('#stats').innerHTML = `
    <div class="card">
      <p class="k">${t('cardMuestreados')}</p><p class="v">${nf(tot.muestreados || tot.virales)}</p>
      <p class="s">${nf(tot.virales)} ${t('cardVirales')} · ${tot.medios} ${t('cardMedios')}</p>
    </div>
    <div class="card">
      <p class="k">${t('cardPoliticos')}</p><p class="v">${nf(tot.clasificados)}</p>
      <p class="s">${Math.round(100 * tot.clasificados / (tot.muestreados || tot.virales))} ${t('cardPctTotal')}</p>
    </div>
    <div class="card">
      <p class="k">${t('cardPartido')}</p><p class="v">PSOE</p>
      <p class="s">${nf(tot.por_partido.PSOE)} ${t('tweets')}, ${Math.round(100 * tot.por_partido.PSOE / totalP)} % ${t('cardPctPoliticos')}</p>
      <div class="bar">${dist.map(d => `<i style="width:${100 * d.v / totalP}%;background:${color[d.p]}"></i>`).join('')}</div>
      <div class="leyenda">${dist.map(d => `<span><i class="dot" style="background:${color[d.p]}"></i>${d.p} ${nf(d.v)}</span>`).join('')}</div>
    </div>
    <div class="card">
      <p class="k">${t('cardDireccion')}</p><p class="v">${Math.round(100 * (tot.por_direccion.perjudica || 0) / totalD)} % ${t('cardCritica')}</p>
      <p class="s">${t('cardDirSub')}</p>
      <div class="bar">${dir.map(d => `<i style="width:${100 * d.v / totalD}%;background:${cdir[d.d]}"></i>`).join('')}</div>
      <div class="leyenda">${dir.map(d => `<span><i class="dot" style="background:${cdir[d.d]}"></i>${dirtxt[d.d]} ${nf(d.v)}</span>`).join('')}</div>
    </div>`;
}

/* ---------- ranking ---------- */
let sortKey = 'indice', sortDir = 1, query = '';

function pintarRanking() {
  const q = query.trim().toLowerCase();
  let rows = INDEX.medios
    .filter(m => (m.izq || 0) + (m.der || 0) > SIGNIFICADOS_MIN)
    .map(m => ({ ...m, pct_politicos: m.muestreados ? 100 * m.politicos / m.muestreados : 0 }))
    .filter(m => !q || m.nombre.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q));
  rows = rows.slice().sort((a, b) => {
    const x = a[sortKey], y = b[sortKey];
    if (typeof x === 'string') return sortDir * x.localeCompare(y);
    return sortDir * (x - y);
  });
  const tb = $('#tabla-ranking tbody');
  if (!rows.length) { tb.innerHTML = `<tr><td colspan="8" class="empty">${t('noMatchRanking')}</td></tr>`; return; }
  tb.innerHTML = rows.map(m => {
    const d = decimos(m), p = reparto(m);
    const tot = d.claro;
    const w = tot ? { i: 100 * m.izq / tot, d: 100 * m.der / tot } : { i: 0, d: 0 };
    const cls = m.indice < -0.05 ? 'n' : m.indice > 0.05 ? 'p' : '';
    const txt = (m.indice > 0 ? '+' : m.indice < 0 ? '−' : '') + Math.abs(m.indice).toFixed(2);
    const pocos = tot < CLARO_MIN;
    const marca = pocos ? ` <span class="star" title="${t('decimosMuestraCorta')}">*</span>` : '';
    return `<tr data-h="${esc(m.handle)}">
      <td><div class="medio-cell"><div><div><strong>${esc(m.nombre)}</strong></div><div class="h">${esc(m.handle)} · ${compact(m.seguidores)} ${t('seguidores')}</div></div></div></td>
      <td class="c-dec">
        <div class="dec">
          <div class="dec-top">${tot ? `<strong>${d.texto}</strong>` : `<span class="dec-sin">${t('decimosSinLado')}</span>`}</div>
          <div class="mini"><i style="width:${w.i}%;background:var(--izq)"></i><i style="width:${w.d}%;background:var(--der)"></i></div>
          <div class="dec-sub">${p.izq} ${t('decimosPctIzq')} · ${p.der} ${t('decimosPctDer')} · ${p.sin} ${t('decimosPctSin')}</div>
          <div class="dec-n">(${nf(tot)} ${t('decimosConLado')})${marca}</div>
        </div>
      </td>
      <td class="num"><span class="idx-pill idx-tech ${cls}" title="${t('idxTooltip')}">${txt}</span></td>
      <td class="num">${nf(m.virales)}</td>
      <td class="num">${nf(m.politicos)}</td>
      <td class="num c-izq">${nf(m.izq)}</td>
      <td class="num c-der">${nf(m.der)}</td>
      <td class="num c-pct">${decsep(m.pct_politicos)} %</td>
    </tr>`;
  }).join('');
  $$('#tabla-ranking thead th[data-sort]').forEach(th => {
    th.classList.toggle('sel', th.dataset.sort === sortKey);
    th.querySelector('.arrow').textContent = th.dataset.sort === sortKey ? (sortDir > 0 ? '▲' : '▼') : '▲';
  });
}
$$('#tabla-ranking thead th[data-sort]').forEach(th => th.addEventListener('click', () => {
  const k = th.dataset.sort;
  if (k === sortKey) sortDir *= -1; else { sortKey = k; sortDir = k === 'indice' ? 1 : -1; }
  pintarRanking();
}));
$('#tabla-ranking tbody').addEventListener('click', e => {
  const tr = e.target.closest('tr[data-h]');
  if (tr) location.hash = '#/medio/' + tr.dataset.h.replace('@', '');
});
$('#tabla-ranking tbody').addEventListener('mouseover', e => {
  const tr = e.target.closest('tr[data-h]');
  if (tr) prefetchMedio(metaDe(tr.dataset.h));
});
$('#q').addEventListener('input', e => { query = e.target.value; pintarRanking(); });

/* ---------- ficha de un medio ---------- */
let MEDIO = null, mSort = 'rt', mParty = '', mDir = '', mText = '', mShown = PAGE;
let currentMedioMeta = null;

async function openMedio(handle) {
  handle = '@' + handle.replace(/^@/, '');
  const meta = INDEX.medios.find(m => m.handle.toLowerCase() === handle.toLowerCase());
  if (!meta) { location.hash = '#/ranking'; return; }
  show('medio');
  $('#medio-panel').innerHTML = `<p class="empty">${t('medioLoading')}</p>`;
  if (!MEDIO || MEDIO.handle !== meta.handle) {
    try {
      const manifest = await pedirJSON('data/' + meta.archivo + VER);
      const base = 'data/' + meta.archivo.replace(/index\.json$/, '');
      const chunks = await Promise.all((manifest.particiones || []).map(part =>
        pedirJSON(base + part.archivo + VER)));
      MEDIO = { ...manifest, tweets: chunks.flatMap(chunk => chunk.tweets || []) };
    } catch (err) {
      $('#medio-panel').innerHTML = `<p class="empty">${t('medioError')}</p>`;
      return;
    }
  }
  mSort = 'rt'; mParty = ''; mDir = ''; mText = ''; mShown = PAGE;
  currentMedioMeta = meta;
  pintarMedio(meta);
}
function pintarMedio(meta) {
  const idx = meta.indice;
  const cls = idx < -0.05 ? 'n' : idx > 0.05 ? 'p' : '';
  const txt = (idx > 0 ? '+' : idx < 0 ? '−' : '') + Math.abs(idx).toFixed(2);
  $('#medio-panel').innerHTML = `
    <div class="medio-head">
      <div>
        <h2>${esc(meta.nombre)}</h2>
        <p class="sub">${esc(meta.handle)} · ${compact(meta.seguidores)} ${t('seguidores')} · ${nf(meta.muestreados || meta.virales)} ${t('medioMuestreados')} · ${nf(meta.virales)} ${t('medioVirales')}</p>
      </div>
      <div><span class="idx-pill ${cls}" style="font-size:16px;padding:7px 14px">${txt}</span></div>
    </div>
    <div class="kpis" id="mkpis"></div>
    <p class="foot-note" id="mkpinota" hidden></p>
    <div class="filters">
      <input type="search" id="mt" placeholder="${t('medioSearchPlaceholder')}" autocomplete="off">
      <select id="mp"></select>
      <select id="md"></select>
      <select id="ms">
        <option value="rt">${t('medioSortRt')}</option>
        <option value="lk">${t('medioSortLk')}</option>
        <option value="vw">${t('medioSortVw')}</option>
        <option value="f">${t('medioSortF')}</option>
      </select>
      <select id="mo"><option value="">${t('medioAllTweets')}</option><option value="pol">${t('medioOnlyPol')}</option></select>
    </div>
    <div id="mlist" class="cards-list"></div>
    <button class="more" id="mmore" hidden>${t('loadMoreN', 0)}</button>`;
  $('#back').onclick = () => { location.hash = '#/ranking'; };
  $('#mt').value = mText;
  $('#ms').value = mSort;
  $('#mt').addEventListener('input', e => { mText = e.target.value; mShown = PAGE; pintarListaMedio(); });
  $('#mp').addEventListener('change', e => { mParty = e.target.value; mShown = PAGE; pintarListaMedio(); });
  $('#md').addEventListener('change', e => { mDir = e.target.value; mShown = PAGE; pintarListaMedio(); });
  $('#ms').addEventListener('change', e => { mSort = e.target.value; pintarListaMedio(); });
  $('#mo').addEventListener('change', e => { mShown = PAGE; pintarListaMedio(); });
  $('#mmore').addEventListener('click', () => { mShown += PAGE; pintarListaMedio(); });
  pintarListaMedio();
}
function filtrarTuits() {
  const q = mText.trim().toLowerCase();
  const soloPol = ($('#mo') || {}).value === 'pol';
  let ts = MEDIO.tweets.filter(tw =>
    (!mParty || tw.p === mParty) &&
    (!mDir || tw.d === mDir) &&
    (!soloPol || tw.p) &&
    (!q || tw.t.toLowerCase().includes(q)));
  ts = ts.slice().sort((a, b) => mSort === 'f' ? (a.f < b.f ? 1 : -1) : (b[mSort] - a[mSort]));
  return ts;
}
function pintarListaMedio() {
  const ts = filtrarTuits();
  pintarMedioCifras(ts);
  const total = ts.length;
  $('#mlist').innerHTML = total
    ? ts.slice(0, mShown).map(tw => tarjeta(tw, MEDIO.handle, MEDIO.nombre)).join('')
    : `<p class="empty">${t('medioNoMatch')}</p>`;
  const more = $('#mmore');
  more.hidden = total <= mShown;
  more.textContent = t('loadMoreN', nf(total - mShown));
}
function pintarMedioCifras(ts) {
  const IZQ = { PSOE: 1, Sumar: 1 }, DER = { PP: 1, Vox: 1 };
  let izq = 0, der = 0, neu = 0, pol = 0;
  for (const tw of ts) {
    if (!tw.p) continue;
    pol++;
    if (tw.d === 'beneficia' && IZQ[tw.p]) izq++;
    else if (tw.d === 'beneficia' && DER[tw.p]) der++;
    else if (tw.d === 'perjudica' && DER[tw.p]) izq++;
    else if (tw.d === 'perjudica' && IZQ[tw.p]) der++;
    else neu++;
  }
  const rts = ts.map(tw => tw.rt).sort((a, b) => a - b);
  const med = rts.length ? rts[Math.floor(rts.length / 2)] : 0;
  const max = rts.length ? rts[rts.length - 1] : 0;
  $('#mkpis').innerHTML = `
      <div class="kpi"><div class="k">${t('kpiPoliticos')}</div><div class="v">${nf(pol)}</div></div>
      <div class="kpi"><div class="k">${t('kpiIzq')}</div><div class="v" style="color:var(--izq)">${nf(izq)}</div></div>
      <div class="kpi"><div class="k">${t('kpiDer')}</div><div class="v" style="color:var(--der)">${nf(der)}</div></div>
      <div class="kpi"><div class="k">${t('kpiNeutro')}</div><div class="v" style="color:var(--neu)">${nf(neu)}</div></div>
      <div class="kpi"><div class="k">${t('kpiRtMed')}</div><div class="v">${nf(med)}</div></div>
      <div class="kpi"><div class="k">${t('kpiRtMax')}</div><div class="v">${nf(max)}</div></div>`;

  const filtrando = !!(mParty || mDir || mText.trim() || ($('#mo') || {}).value === 'pol');
  const nota = $('#mkpinota');
  nota.hidden = !filtrando;
  nota.textContent = filtrando ? t('kpiNotaFiltros', nf(ts.length)) : '';

  const q = mText.trim().toLowerCase();
  const soloPol = ($('#mo') || {}).value === 'pol';
  const base = MEDIO.tweets.filter(tw => (!soloPol || tw.p) && (!q || tw.t.toLowerCase().includes(q)));
  const cPart = {}, cDir = {};
  const dirtxt = DIRTXT();
  for (const tw of base) {
    if (tw.p && (!mDir || tw.d === mDir)) cPart[tw.p] = (cPart[tw.p] || 0) + 1;
    if (tw.d && (!mParty || tw.p === mParty)) cDir[tw.d] = (cDir[tw.d] || 0) + 1;
  }
  const mp = $('#mp'), md = $('#md');
  if (mp) {
    mp.innerHTML = `<option value="">${t('medioAllParty')}</option>` +
      PARTIDOS.filter(p => cPart[p] || p === mParty).map(p => `<option value="${p}">${p} (${nf(cPart[p] || 0)})</option>`).join('');
    mp.value = mParty;
  }
  if (md) {
    md.innerHTML = `<option value="">${t('medioAllDir')}</option>` +
      ['beneficia', 'perjudica', 'neutro'].filter(d => cDir[d] || d === mDir).map(d => `<option value="${d}">${dirtxt[d]} (${nf(cDir[d] || 0)})</option>`).join('');
    md.value = mDir;
  }
}

/* ---------- tarjeta de tuit ---------- */
function tarjeta(tw, handle, nombre) {
  const low = (tw.pc && tw.pc < 0.6) || (tw.dc && tw.dc < 0.6);
  const chips = [];
  const dirtxt = DIRTXT();
  const confTxt = t('tweetConfianza');
  if (tw.p) chips.push(`<span class="chip ${CHIP[tw.p] || 'otros'} ${low ? 'low' : ''}" title="${confTxt} ${(tw.pc * 100).toFixed(0)} %">${tw.p}</span>`);
  if (tw.d) chips.push(`<span class="chip ${DIRCHIP[tw.d] || 'neu'} ${low ? 'low' : ''}" title="${confTxt} ${(tw.dc * 100).toFixed(0)} %">${dirtxt[tw.d]}</span>`);
  if (tw.ir >= 0.6) chips.push(`<span class="chip otros" title="${t('tweetIroniaDet')}">${t('tweetIronia')}</span>`);
  return `<article class="tweet">
    <div class="head">
      <span class="who">${esc(nombre || handle)}</span>
      <span>${esc(handle)}</span>
      <span>${fecha(tw.f)}</span>
      <span class="chips">${chips.join('')}</span>
    </div>
    <p>${esc(tw.t)}</p>
    <div class="metrics">
      <span>🔁 <b>${nf(tw.rt)}</b> ${t('tweetRetuits')}</span>
      <span>❤️ <b>${nf(tw.lk)}</b> ${t('tweetMeGusta')}</span>
      <span>💬 <b>${nf(tw.rp)}</b></span>
      <span>👁️ <b>${compact(tw.vw)}</b></span>
      <span><a href="${esc(tw.u)}" target="_blank" rel="noopener">${t('tweetVerX')}</a></span>
    </div>
  </article>`;
}

/* ---------- top virales ---------- */
let TOP = null, topShown = PAGE, topParty = '', topDir = '';
async function cargarTop() {
  if (TOP) { pintarTop(); return; }
  TOP = await pedirJSON('data/top.json' + VER);
  pintarTopFiltros();
  pintarTop();
}
function pintarTopFiltros() {
  const cnt = {};
  TOP.forEach(tw => { cnt[tw.p] = (cnt[tw.p] || 0) + 1; });
  const dirtxt = DIRTXT();
  $('#top-filtros').innerHTML = `
    <select id="tp"><option value="">${t('topAllParty')}</option>${PARTIDOS.filter(p => cnt[p]).map(p => `<option value="${p}">${p} (${nf(cnt[p])})</option>`).join('')}</select>
    <select id="td"><option value="">${t('topAllDir')}</option><option value="beneficia">${dirtxt.beneficia}</option><option value="perjudica">${dirtxt.perjudica}</option><option value="neutro">${dirtxt.neutro}</option></select>`;
  $('#tp').value = topParty;
  $('#td').value = topDir;
  $('#tp').addEventListener('change', e => { topParty = e.target.value; topShown = PAGE; pintarTop(); });
  $('#td').addEventListener('change', e => { topDir = e.target.value; topShown = PAGE; pintarTop(); });
  $('#top-more').addEventListener('click', () => { topShown += PAGE; pintarTop(); });
}
function pintarTop() {
  if (!TOP) return;
  const ts = TOP.filter(tw => (!topParty || tw.p === topParty) && (!topDir || tw.d === topDir));
  $('#top-list').innerHTML = ts.length ? ts.slice(0, topShown).map(tw => tarjeta(tw, tw.h, tw.h)).join('')
    : `<p class="empty">${t('topNoMatch')}</p>`;
  const m = $('#top-more');
  m.hidden = ts.length <= topShown;
  m.textContent = t('loadMoreN', nf(ts.length - topShown));
}

/* ---------- mapa de dispersión ----------
   Eje X: posición izquierda → derecha (0 = todo izquierda, 100 = todo derecha).
   Rojo a la izquierda, azul a la derecha (convención española).
   El control de series muestra publicado, viral o ambas. En "ambas" una flecha
   parte del punto publicado y termina en el viral: hacia dónde se desplaza el
   medio cuando su contenido se comparte. */
const MAPA_COLOR = { izq: 'var(--map-izq)', der: 'var(--map-der)', neu: 'var(--map-neu)' };
const ladoDe = p => p < 45 ? 'izq' : p > 55 ? 'der' : 'neu';
const colorDe = p => MAPA_COLOR[ladoDe(p)];

let mapaSerie = 'publicado';
let mapaFiltro = 5;
let mapaPeriodo = 'todo';
const MAPA_ANOS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];
let mapaTimer = null;

function actualizarPlay() {
  const btn = $('#mapa-play');
  if (!btn) return;
  const activo = mapaTimer !== null;
  btn.textContent = activo ? t('mapaPause', mapaPeriodo) : t('mapaPlay');
  btn.setAttribute('aria-pressed', activo ? 'true' : 'false');
}

function pararEvolucion() {
  if (mapaTimer !== null) clearInterval(mapaTimer);
  mapaTimer = null;
  actualizarPlay();
}

function fijarPeriodoMapa(valor, manual = false) {
  if (manual) pararEvolucion();
  mapaPeriodo = PERIODOS_VALIDOS.includes(valor) ? valor : 'todo';
  const sel = $('#mapa-periodo');
  if (sel) sel.value = mapaPeriodo;
  const nuevoHash = '#/mapa' + hashPeriodo();
  if (location.hash !== nuevoHash) history.replaceState(null, '', nuevoHash);
  renderMapa();
  actualizarPlay();
}

function reproducirEvolucion() {
  if (mapaTimer !== null) { pararEvolucion(); return; }
  fijarPeriodoMapa('2018');
  mapaTimer = setInterval(() => {
    const actual = MAPA_ANOS.indexOf(mapaPeriodo);
    if (actual >= MAPA_ANOS.length - 1) { pararEvolucion(); return; }
    fijarPeriodoMapa(MAPA_ANOS[actual + 1]);
  }, 1450);
  actualizarPlay();
}

function mediosPeriodo() {
  if (!POL) return [];
  const bloque = POL.periodos && POL.periodos[mapaPeriodo];
  if (bloque && Array.isArray(bloque.medios)) return bloque.medios;
  return POL.medios || [];
}
function polDe(handle) {
  return mediosPeriodo().find(r => r.handle.toLowerCase() === (handle || '').toLowerCase());
}
const periodoTxt = () => ({
  todo: t('periodoTodo'), xv: t('periodoXV'),
  2018: '2018', 2019: '2019', 2020: '2020', 2021: '2021', 2022: '2022',
  2023: '2023', 2024: '2024', 2025: '2025', 2026: '2026'
});
const RADIO = v => Math.max(9, 0.85 * Math.sqrt(Math.max(v, 120)));
const RADIO_VIRAL = 0.84;
const YTICKS = [0, 20, 40, 60, 80, 100];
const volumen = d => d.politicos != null ? `${nf(d.politicos)} ${t('tipPoliticos')}` : `${nf(d.juicios)} ${t('tweetsConLectura')}`;
const porcentajeConLado = d => d && d.tuits ? 100 * (d.con_lado || 0) / d.tuits : 0;
const nombreSerie = s => s === 'publicado' ? t('publicado') : t('viral');

function filasMapa() {
  const metas = new Map(INDEX.medios.map(m => [m.handle.toLowerCase(), m]));
  const nodos = [], parejas = [];
  for (const r of mediosPeriodo()) {
    const m = metas.get(r.handle.toLowerCase());
    if (!m) continue;
    if ((m.izq || 0) + (m.der || 0) <= SIGNIFICADOS_MIN) continue;
    const pub = r.publicado, vir = r.viral;
    const okPub = !!pub && pub.posicion != null && pub.con_lado >= mapaFiltro;
    const okVir = !!vir && vir.posicion != null && vir.con_lado >= mapaFiltro;
    const nodoPub = { m, serie: 'publicado', p: pub ? pub.posicion : 0, y: porcentajeConLado(pub), d: pub, o: vir };
    const nodoVir = { m, serie: 'viral', p: vir ? vir.posicion : 0, y: porcentajeConLado(vir), d: vir, o: pub };
    if (mapaSerie === 'ambas') {
      if (!okPub || !okVir) continue;
      nodos.push(nodoPub, nodoVir);
      parejas.push({ m, p1: pub.posicion, y1: porcentajeConLado(pub), p2: vir.posicion, y2: porcentajeConLado(vir), pub, vir });
    } else if (mapaSerie === 'publicado' ? okPub : okVir) {
      nodos.push(mapaSerie === 'publicado' ? nodoPub : nodoVir);
    }
  }
  return { nodos, parejas };
}

function renderMapa() {
  const svg = $('#mapa');
  if (!INDEX) return;
  if (!POL) {
    svg.innerHTML = '';
    $('#mapa-resumen').textContent = '';
    $('#mapa-pie').innerHTML = `<div class="blq">${t('mapaNoDatos')}</div>`;
    return;
  }
  const posicionesAnteriores = new Map([...svg.querySelectorAll('.burbuja')].map(el => [
    `${el.dataset.h}|${el.dataset.serie}`, el.getAttribute('transform')
  ]));
  const { nodos, parejas } = filasMapa();
  const totalUniverso = mediosPeriodo().length;
  const admitidos = new Set(INDEX.medios
    .filter(m => (m.izq || 0) + (m.der || 0) > SIGNIFICADOS_MIN)
    .map(m => m.handle.toLowerCase()));
  const total = mediosPeriodo().filter(r => admitidos.has(r.handle.toLowerCase())).length;
  const dibujados = new Set(nodos.map(n => n.m.handle)).size;
  const fuera = total - dibujados;
  const fueraCorte = totalUniverso - total;

  const W = 1000, H = 620, M = { t: 46, r: 54, b: 66, l: 82 };
  const lista = YTICKS;
  const px = v => M.l + v / 100 * (W - M.l - M.r);
  const PAD = 32;
  const py = v => H - M.b - Math.max(0, Math.min(100, v)) / 100 * (H - M.t - M.b - PAD);
  const mitad = px(50);

  const ZONAS = [
    [0, 20, t('zonaMuyIzq'), 'z-miz'],
    [20, 40, t('zonaIzq'), 'z-iz'],
    [40, 60, t('zonaEq'), 'z-eq'],
    [60, 80, t('zonaDer'), 'z-dr'],
    [80, 100, t('zonaMuyDer'), 'z-mdr'],
  ];
  let g = '', etiquetas = '';
  ZONAS.forEach(([a, z, txt, cls]) => {
    const x = px(a), w = px(z) - x;
    g += `<rect class="zona ${cls}" x="${x.toFixed(1)}" y="${M.t}" width="${w.toFixed(1)}" height="${H - M.b - M.t}"></rect>`;
    etiquetas += `<text x="${(x + w / 2).toFixed(1)}" y="${M.t - 8}">${txt}</text>`;
  });
  lista.forEach(tick => {
    g += `<line x1="${M.l}" x2="${W - M.r}" y1="${py(tick).toFixed(1)}" y2="${py(tick).toFixed(1)}"></line>`;
    g += `<text x="${M.l - 11}" y="${(py(tick) + 4).toFixed(1)}" text-anchor="end">${nf(tick)} %</text>`;
  });
  const EJEX = [[0, t('ticDerechaN', 0)], [20, t('ticDerechaN', 2)], [40, t('ticDerechaN', 4)], [50, t('ticMitad')],
                [60, t('ticDerechaN', 6)], [80, t('ticDerechaN', 8)], [100, t('ticDerechaN', 10)]];
  EJEX.forEach(([v, txt]) => {
    const x = px(v).toFixed(1), c = v === 50 ? 'mitad' : '';
    g += `<line class="${c}" x1="${x}" x2="${x}" y1="${M.t}" y2="${H - M.b}"></line>`;
    g += `<text class="${c}" x="${x}" y="${H - M.b + 21}" text-anchor="middle">${txt}</text>`;
  });
  const tituloPeriodo = periodoTxt()[mapaPeriodo] || mapaPeriodo;
  const tituloY = t('axisYTitle', tituloPeriodo);
  g += `<text class="tit" x="${M.l}" y="18">${tituloY}</text>`;
  g += `<text class="tit" x="${M.l}" y="${H - M.b + 46}">${t('axisLeft')}</text>`;
  g += `<text class="tit" x="${mitad.toFixed(1)}" y="${H - M.b + 46}" text-anchor="middle">${t('axisMid')}</text>`;
  g += `<text class="tit" x="${W - M.r}" y="${H - M.b + 46}" text-anchor="end">${t('axisRight')}</text>`;

  const flechas = parejas.map(f => {
    const x1 = px(f.p1), y1 = py(f.y1), x2 = px(f.p2), y2 = py(f.y2);
    const r1 = RADIO(f.m.rt_media), r2 = RADIO(f.m.rt_media) * RADIO_VIRAL;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    if (L < r1 + r2 + 30) return '';
    const ux = dx / L, uy = dy / L;
    const sx = x1 + ux * (r1 + 3), sy = y1 + uy * (r1 + 3);
    const ex = x2 - ux * (r2 + 4), ey = y2 - uy * (r2 + 4);
    const hl = 11, hw = 5.4;
    const bx = ex - ux * hl, by = ey - uy * hl, nx = -uy, ny = ux;
    const c = colorDe(f.p1), delta = f.p2 - f.p1;
    return `<g class="flecha lado-${ladoDe(f.p1)}" data-h="${esc(f.m.handle)}" data-delta="${delta.toFixed(1)}"
        data-publicado="${f.p1.toFixed(1)}" data-viral="${f.p2.toFixed(1)}"
        data-x1="${x1.toFixed(1)}" data-y1="${y1.toFixed(1)}" data-x2="${x2.toFixed(1)}" data-y2="${y2.toFixed(1)}">
      <path class="rastro" d="M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${bx.toFixed(1)} ${by.toFixed(1)}" stroke="${c}"></path>
      <polygon class="punta" fill="${c}" points="${ex.toFixed(1)},${ey.toFixed(1)} ${(bx + nx * hw).toFixed(1)},${(by + ny * hw).toFixed(1)} ${(bx - nx * hw).toFixed(1)},${(by - ny * hw).toFixed(1)}"></polygon>
    </g>`;
  }).join('');

  const orden = nodos.slice().sort((a, b) => RADIO(b.m.rt_media) - RADIO(a.m.rt_media));
  const burbujas = orden.map((n, i) => {
    const r = RADIO(n.m.rt_media) * (n.serie === 'viral' ? RADIO_VIRAL : 1);
    const cx = px(n.p), cy = py(n.y);
    const d = (r * 1.74).toFixed(1), off = (-r * 0.87).toFixed(1);
    return `<g class="burbuja burbuja-${n.serie} lado-${ladoDe(n.p)}" data-h="${esc(n.m.handle)}"
        data-serie="${n.serie}" data-posicion="${n.p.toFixed(1)}" data-i="${i}" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)})">
      <circle class="aro${n.serie === 'viral' ? ' dis' : ''}" r="${r.toFixed(1)}" stroke="${colorDe(n.p)}"></circle>
      <image href="${esc(n.m.logo)}" x="${off}" y="${off}" width="${d}" height="${d}"></image>
    </g>`;
  }).join('');

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `<g class="grid">${g}</g><g class="flechas">${flechas}</g><g class="nodos">${burbujas}</g><g class="etiquetas">${etiquetas}</g>`;

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const coords = valor => (valor || '').match(/translate\(([-0-9.]+),\s*([-0-9.]+)\)/);
    svg.querySelectorAll('.burbuja').forEach(el => {
      const anterior = posicionesAnteriores.get(`${el.dataset.h}|${el.dataset.serie}`);
      const destino = el.getAttribute('transform');
      const a = coords(anterior), b = coords(destino);
      if (a && b) {
        el.animate([
          { transform: `translate(${a[1]}px, ${a[2]}px)` },
          { transform: `translate(${b[1]}px, ${b[2]}px)` },
        ], { duration: 900, easing: 'cubic-bezier(.22,.75,.25,1)' });
      } else {
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
      }
    });
  }

  const res = [];
  if (mapaSerie === 'ambas') {
    const deltas = parejas.map(f => f.p2 - f.p1).sort((a, b) => a - b);
    const med = deltas.length ? deltas[Math.floor(deltas.length / 2)] : 0;
    const suLado = parejas.filter(f => f.p1 < 50 ? f.p2 < f.p1 : f.p1 > 50 ? f.p2 > f.p1 : false).length;
    res.push(t('mapaResAmbas', nf(parejas.length)));
    if (parejas.length) res.push(t('mapaResDespSuLado', suLado, parejas.length));
    res.push(med === 0
      ? t('mapaResMedianaCero')
      : t('mapaResMediana', decsep(Math.abs(med)), med < 0 ? t('izquierda') : t('derecha')));
  } else {
    res.push(t('mapaResSolo', nf(dibujados), nombreSerie(mapaSerie)));
  }
  $('#mapa-resumen').textContent = res.join(' ');

  svg.querySelectorAll('.burbuja').forEach(el => {
    const n = orden[Number(el.dataset.i)];
    if (!n) return;
    const m = n.m;
    el.addEventListener('mouseenter', e => {
      if (el !== el.parentNode.lastElementChild) el.parentNode.appendChild(el);
      prefetchMedio(m);
      tipMapa(n, e);
    });
    el.addEventListener('mousemove', e => tipMapa(n, e));
    el.addEventListener('mouseleave', () => { $('#mapa-tip').hidden = true; });
    el.addEventListener('touchstart', () => prefetchMedio(m), { passive: true });
    el.addEventListener('pointerdown', () => prefetchMedio(m));
    el.addEventListener('click', () => { location.hash = '#/medio/' + m.handle.replace('@', ''); });
  });

  const bola = v => `<span class="bola" style="width:${(2 * RADIO(v)).toFixed(0)}px;height:${(2 * RADIO(v)).toFixed(0)}px"></span> ${nf(v)} RT`;
  const notaFiltro = mapaFiltro ? t('mapaPieFiltroN', nf(mapaFiltro)) : t('mapaPieFiltro0');
  $('#mapa-pie').innerHTML = `
    <div class="blq"><strong>${t('mapaPieTam')}</strong> ${bola(200)} ${bola(500)} ${bola(1000)}</div>
    <div class="blq"><strong>${t('mapaPieAro')}</strong> <span class="aro" style="border-color:var(--map-izq)"></span> ${t('mapaPieIzq')}
      <span class="aro" style="border-color:var(--map-der);margin-left:10px"></span> ${t('mapaPieDer')}
      <span class="aro" style="border-color:var(--map-neu);margin-left:10px"></span> ${t('mapaPieCentro')}</div>
    ${mapaSerie === 'ambas' ? `<div class="blq"><strong>${t('mapaPieAroContinuo')}</strong> ${t('mapaPiePublicado')} · <strong>${t('mapaPieAroDiscontinuo')}</strong> ${t('mapaPieLoViral')}</div>
      <div class="blq"><strong>${t('mapaPieFlecha')}</strong> ${t('mapaPieFlechaDesc')}</div>` : ''}
    <div class="blq"><strong>${t('mapaPieAltura')}</strong> ${t('mapaPieAlturaDesc')}</div>
    <div class="blq"><strong>${t('mapaPieCorte')}</strong> ${t('mapaPieCorteDesc')}</div>
    <div class="blq">${notaFiltro}</div>
    ${fueraCorte ? `<div class="blq">${t('mapaPieFueraCorte', fueraCorte)}</div>` : ''}
    ${fuera ? `<div class="blq">${t('mapaPieFuera', fuera)}</div>` : ''}`;
}

function tipMapa(n, ev) {
  const tip = $('#mapa-tip'), wrap = $('.chart-wrap');
  const m = n.m;
  const pub = n.serie === 'publicado' ? n.d : n.o;
  const vir = n.serie === 'viral' ? n.d : n.o;
  const linea = (dat, etq) => dat && dat.posicion != null
    ? `<div class="tv"><b>${etq}</b>: ${decsep(dat.posicion)} ${t('tipADerecha')}${dat.con_lado < 15 ? ' (' + t('tipMuestraCorta') + ')' : ''} · ${decsep(porcentajeConLado(dat))} ${t('tipPctSerie')} · ${nf(dat.con_lado)} ${t('tipDe')} ${nf(dat.tuits)} ${t('tipTuits')}</div>`
    : '';
  let desplaz = '';
  if (pub && vir && pub.posicion != null && vir.posicion != null && vir.con_lado >= 5) {
    const delta = vir.posicion - pub.posicion;
    desplaz = Math.abs(delta) < 0.05
      ? `<div class="tv frase">${t('tipDesplazaQueda')}</div>`
      : `<div class="tv frase">${t('tipDesplaza', decsep(Math.abs(delta)), delta < 0 ? t('izquierda') : t('derecha'))}</div>`;
  }
  const d = decimos(m), p = reparto(m);
  const frase = !d.claro
    ? `${t('tipSinLado')} (${nf(m.politicos)} ${t('tipPoliticos')})`
    : `${d.texto} (${nf(d.claro)} ${t('tipClaros')} ${nf(m.politicos)} ${t('tipPoliticos')}; ${p.sin} ${t('tipSinLadoPct')})`;
  tip.innerHTML = `<div class="tt">${esc(m.nombre)}</div>
    <div class="tv frase">${esc(frase)}</div>
    ${linea(pub, t('tipPublicado'))}${linea(vir, t('tipViral'))}${desplaz}
    <div class="tv tm">${esc(m.handle)} · ${nf(m.rt_media)} ${t('tipRtMedia')} · ${t('tipIndiceMuestra')} ${m.indice > 0 ? '+' : m.indice < 0 ? '−' : ''}${Math.abs(m.indice).toFixed(2)}</div>`;
  tip.hidden = false;
  const r = wrap.getBoundingClientRect();
  let x = ev.clientX - r.left + 16, y = ev.clientY - r.top + 14;
  if (x + tip.offsetWidth > r.width - 4) x = ev.clientX - r.left - tip.offsetWidth - 16;
  if (y + tip.offsetHeight > r.height - 4) y = Math.max(4, r.height - tip.offsetHeight - 4);
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

/* ---------- idioma y tema ---------- */
function applyLang() {
  const doc = document;
  doc.documentElement.setAttribute('lang', LANG);
  doc.documentElement.setAttribute('data-lang', LANG);
  doc.title = t('title');
  const setMeta = (sel, val) => { const el = doc.querySelector(sel); if (el) el.setAttribute('content', val); };
  setMeta('meta[name="description"]', t('description'));
  setMeta('meta[property="og:title"]', t('ogTitle'));
  setMeta('meta[property="og:description"]', t('ogDescription'));

  $$('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  $$('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    el.innerHTML = t(key);
  });
  $$('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
  $$('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
  });
  actualizarPlay();
}
function reRenderCurrent() {
  if (!INDEX) return;
  pintarTotales();
  pintarStats();
  pintarRanking();
  if (currentView === 'medio' && currentMedioMeta && MEDIO) pintarMedio(currentMedioMeta);
  if (currentView === 'top' && TOP) { pintarTopFiltros(); pintarTop(); }
  renderMapa();
}
function setLang(newLang) {
  if (newLang !== 'es' && newLang !== 'en') newLang = 'es';
  if (newLang === LANG) return;
  LANG = newLang;
  try { localStorage.setItem('mv-lang', LANG); } catch (e) {}
  applyLang();
  reRenderCurrent();
}
function getInitialLang() {
  try {
    const stored = localStorage.getItem('mv-lang');
    if (stored === 'es' || stored === 'en') return stored;
  } catch (e) {}
  const doc = document.documentElement.getAttribute('data-lang');
  if (doc === 'es' || doc === 'en') return doc;
  const nav = (navigator.language || 'es').toLowerCase();
  return nav.startsWith('en') ? 'en' : 'es';
}

const THEME_KEY = 'mv-theme';
function systemDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function resolveTheme(pref) {
  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  return systemDark() ? 'dark' : 'light';
}
function applyTheme(pref) {
  const resolved = resolveTheme(pref);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-theme-pref', pref);
  // Ajusta theme-color efectivo: el navegador usa el que coincide con prefers-color-scheme,
  // pero en preferencia forzada añadimos un <meta name="theme-color"> sin media que gana.
  const forced = pref === 'system' ? null : (resolved === 'dark' ? '#1a1613' : '#faf8f5');
  let m = document.querySelector('meta[name="theme-color"][data-forced]');
  if (forced) {
    if (!m) {
      m = document.createElement('meta');
      m.setAttribute('name', 'theme-color');
      m.setAttribute('data-forced', '1');
      document.head.appendChild(m);
    }
    m.setAttribute('content', forced);
  } else if (m) {
    m.remove();
  }
}
function setTheme(pref) {
  if (pref !== 'light' && pref !== 'dark' && pref !== 'system') pref = 'system';
  try { localStorage.setItem(THEME_KEY, pref); } catch (e) {}
  applyTheme(pref);
}
function getInitialThemePref() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch (e) {}
  const doc = document.documentElement.getAttribute('data-theme-pref');
  if (doc === 'light' || doc === 'dark' || doc === 'system') return doc;
  return 'system';
}
function watchSystemTheme() {
  if (!window.matchMedia) return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => {
    const pref = document.documentElement.getAttribute('data-theme-pref') || 'system';
    if (pref === 'system') applyTheme('system');
  };
  if (mq.addEventListener) mq.addEventListener('change', listener);
  else if (mq.addListener) mq.addListener(listener);
}

/* ---------- arranque ---------- */
(async function init() {
  LANG = getInitialLang();
  applyLang();
  const themePref = getInitialThemePref();
  applyTheme(themePref);
  watchSystemTheme();

  const langSel = $('#lang-select');
  if (langSel) {
    langSel.value = LANG;
    langSel.addEventListener('change', e => setLang(e.target.value));
  }
  const themeSel = $('#theme-select');
  if (themeSel) {
    themeSel.value = themePref;
    themeSel.addEventListener('change', e => setTheme(e.target.value));
  }

  INDEX = await pedirJSON('data/index.json');
  VER = INDEX.ver ? '?v=' + INDEX.ver : '';
  pintarTotales();
  pintarStats();
  pintarRanking();
  try {
    POL = await pedirJSON('data/polarizacion.json' + VER);
  } catch (err) {
    POL = null;
  }
  $('#mapa-serie').addEventListener('change', e => { mapaSerie = e.target.value; renderMapa(); });
  $('#mapa-filtro').value = String(mapaFiltro);
  $('#mapa-filtro').addEventListener('change', e => { mapaFiltro = Number(e.target.value) || 0; renderMapa(); });
  const selPer = $('#mapa-periodo');
  if (selPer) {
    selPer.value = mapaPeriodo;
    selPer.addEventListener('change', e => fijarPeriodoMapa(e.target.value, true));
  }
  const play = $('#mapa-play');
  if (play) play.addEventListener('click', reproducirEvolucion);
  actualizarPlay();
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (h === 'top') { await cargarTop(); }
  route();
})();
window.addEventListener('hashchange', () => { if (location.hash.includes('top')) cargarTop(); });
