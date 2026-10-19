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
// artículos para los partidos en castellano: «del PSOE», «de Vox», «al PP», «a Sumar»
const conArticulo = p => p === 'PSOE' || p === 'PP';
const delP = p => conArticulo(p) ? `del ${p}` : `de ${p}`;
const alP = p => conArticulo(p) ? `al ${p}` : `a ${p}`;
const elP = p => conArticulo(p) ? `el ${p}` : p;
const I18N = {
  es: {
    title: 'Sesgo y viralidad de los medios españoles · victoriano.me',
    description: 'Mapa histórico de 607.571 tuits de 68 medios españoles entre 2018 y 2026: posición de lo publicado frente a lo viral.',
    ogTitle: 'Sesgo y viralidad de los medios españoles',
    ogDescription: '607.571 tuits de 68 medios entre 2018 y 2026, clasificados por partido y dirección, con comparación entre lo publicado y lo viral.',
    kicker: 'Un análisis de datos',
    headline: '¿Cuál es el <span class="t-mix">sesgo</span> de los medios españoles en redes?',
    byline: 'Por <strong>Victoriano Izquierdo</strong> · Datos de X, 2018 a 2026',

    lede: (nVirales, nMedios) => `<strong id="n-virales">${nVirales}</strong> tuits muestreados de <strong id="n-medios">${nMedios}</strong> medios entre 2018 y 2026, clasificados según a qué partido benefician o perjudican. Cada punto es un medio: pulsa para leer sus tuits.`,
    tabMapa: 'Mapa',
    tabRanking: 'Ranking',
    descargar: '↓ Descargar imagen',
    descargaError: 'No se ha podido crear la imagen.',
    descargaPie: 'medios.victoriano.me · Sesgo político de los medios españoles medido sobre sus tuits',
    tabContenidos: 'Contenidos',
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
    mapaTitle: 'Cómo leer el mapa',
    ctlPeriodo: 'Periodo',
    ctlTuits: 'Tuits',
    ctlMuestra: 'Medios',
    tipoNombre: k => ({
      prensa: 'Prensa escrita', digital: 'Digital', tv: 'Televisión', programa_tv: 'Programa de televisión',
      radio: 'Radio', programa_radio: 'Programa de radio', agencia: 'Agencia de noticias',
    })[k] || k,
    mapaTipoOpcion: (nombre, n) => `${nombre} (${n})`,
    mapaTipoGrupo: 'Por tipo',
    mapaPieTipoK: 'Tipo:',
    mapaPieTipo: nombre => `solo se dibujan las cuentas de tipo «${nombre}». Televisión agrupa cadenas y sus informativos; los programas van aparte porque no son un medio sino un espacio dentro de una cadena.`,
    mapaPeriodoAll: 'Serie completa',
    mapaPeriodoXV: 'XV Legislatura',
    mapaSerieAmbas: 'Comparar todos y 100 RT o más',
    mapaSeriePub: 'Todos los tuits',
    mapaSerieViral: '100 RT o más',
    mapaPlay: '▶ Evolución 2018 a 2026',
    mapaPause: (year) => `⏸ Pausar · ${year}`,
    ariaPlay: 'Reproducir o pausar la evolución anual del mapa',
    trayTitulo: (nombre, a0, a1) => `Recorrido de <strong>${nombre}</strong> de ${a0} a ${a1}`,
    traySerie: (serie) => serie === 'viral' ? 'con los tuits de 100 RT o más' : 'con todos los tuits',
    trayFaltan: (anos) => `Sin muestra suficiente en ${anos}.`,
    trayPocos: (nombre) => `${nombre} no tiene muestra suficiente en dos años o más para dibujar su recorrido.`,
    trayTuits: 'Ver sus tuits →',
    trayQuitar: 'Quitar ✕',
    trayAyuda: 'Pulsa en un medio para ver su recorrido año a año.',
    mapaPieTray: 'Recorrido',
    mapaPieTrayDesc: 'cada punto es un año y las flechas van del primero al último. El eje vertical usa la escala anual, ajustada al medio cuando se ve la serie completa o la legislatura.',
    trayAyudaQuitar: 'Pulsa fuera del recorrido o en «Quitar» para volver a ver todos los medios.',
    ctlEjeY: 'Eje vertical',
    ctlAjustes: 'Ejes y tamaño',
    varCorta: (v) => ({ con_lado: 'A favor o en contra', ben: 'Lo benefician', perj: 'Lo perjudican', politicos: 'Tuits políticos',
                        tuits: 'Tuits muestreados', rt_media: 'Media RT', rt_mediana: 'Mediana RT' })[v],
    ctlTam: 'Tamaño',
    ariaEjeY: 'Variable del eje vertical',
    ariaTam: 'Variable del tamaño de las burbujas',
    varOpcion: (v, p) => ({
      con_lado: p ? `Tuits a favor o en contra ${delP(p)}` : 'Tuits a favor o en contra de un partido',
      ben: p ? `Tuits que benefician ${alP(p)}` : 'Tuits que benefician',
      perj: p ? `Tuits que perjudican ${alP(p)}` : 'Tuits que perjudican',
      politicos: 'Tuits políticos del medio',
      tuits: 'Tuits muestreados',
      rt_media: 'Media de retuits',
      rt_mediana: 'Mediana de retuits',
    })[v],
    varDesc: (v, p) => ({
      con_lado: p ? `número de tuits que benefician o perjudican claramente ${alP(p)}.` : 'número de tuits clasificados que benefician o perjudican claramente a un partido.',
      ben: `número de tuits que benefician ${alP(p)}.`,
      perj: `número de tuits que perjudican ${alP(p)}.`,
      politicos: 'número de tuits del medio con lectura política, tomen partido o no.',
      tuits: 'número de tuits muestreados del medio en la serie elegida.',
      rt_media: p ? `media de retuits de los tuits que benefician o perjudican ${alP(p)}.` : 'media de retuits de los tuits con lado claro.',
      rt_mediana: p ? `mediana de retuits de los tuits que benefician o perjudican ${alP(p)}.` : 'mediana de retuits de los tuits con lado claro.',
    })[v],
    varTitulo: (v, p, periodo) => `${({
      ben: `Tuits que benefician ${alP(p)}`, perj: `Tuits que perjudican ${alP(p)}`,
      politicos: 'Tuits políticos del medio', tuits: 'Tuits muestreados',
      rt_media: 'Media de retuits', rt_mediana: 'Mediana de retuits',
    })[v]} · ${periodo}`,
    ctlPartido: 'Partido',
    ariaPartido: 'Ver la posición de los medios respecto a un partido',
    mapaPartidoTodos: 'Izquierda y derecha',
    mapaFiltroTodos: 'Todos los medios',
    mapaFiltroB200: 'Brecha fiable: 200 con lado en cada serie',
    mapaPieFiltroTodos: 'Se dibujan todos los medios con 5 o más tuits con lado claro en la serie elegida.',
    zonaMuyIzqP: () => 'muy en contra',
    zonaIzqP: () => 'en contra',
    zonaEqP: () => 'equilibrio',
    zonaDerP: () => 'a favor',
    zonaMuyDerP: () => 'muy a favor',
    axisLeftP: (p) => `◀ todo en contra ${delP(p)}`,
    axisMidP: (p) => `% de los tuits sobre ${elP(p)} que lo favorecen`,
    axisRightP: (p) => `todo a favor ${delP(p)} ▶`,
    axisYTitleP: (p, periodo) => `Tuits que benefician o perjudican ${alP(p)} · ${periodo}`,
    mapaPieIzqP: () => 'en contra',
    mapaPieDerP: () => 'a favor',
    mapaPieCentroP: () => 'equilibrio',
    mapaPieAlturaDescP: (p) => `número de tuits que benefician o perjudican claramente ${alP(p)}.`,
    mapaPiePartido: (p) => `Posición respecto ${alP(p)}: 0 si todos los tuits del medio sobre ${elP(p)} lo perjudican, 100 si todos lo favorecen. Podemos se cuenta dentro de Sumar.`,
    mapaPiePartidoK: 'Partido',
    mapaResDespSuLadoP: (p, n, total) => `${n} de ${total} se alejan del equilibrio al compartirse.`,
    mapaResMedianaP: (p, pts, aFavor) => `La mediana del desplazamiento es de ${pts} puntos ${aFavor ? 'a favor' : 'en contra'} ${delP(p)}.`,
    tipADerechaP: (p) => `% a favor ${delP(p)}`,
    tipDesplazaP: (p, pts, aFavor) => `Al compartirse se desplaza ${pts} puntos ${aFavor ? 'a favor' : 'en contra'} ${delP(p)}.`,
    histKicker: 'Lo que dicen los datos',
    histTitle: 'Cuatro cosas que se ven en el mapa',
    histIntro: 'Un tuit cuenta a la <span class="rojo">izquierda</span> si beneficia a PSOE o Sumar o perjudica a PP o Vox, y a la <span class="azul">derecha</span> en el caso contrario. Todas las cifras salen de la misma muestra que dibuja el mapa.',
    hist1T: 'Hay más medios a la derecha que a la izquierda',
    hist1P: (nDer, nIzq, nCen, nTot, pub, a0, a1) => `De los ${nTot} medios del mapa, <strong>${nDer}</strong> publican sobre todo a la derecha, <strong>${nIzq}</strong> a la izquierda y ${nCen} quedan en el centro. Sumando todos los tuits con lado claro, el <strong>${pub} %</strong> cae a la derecha. Esa proporción ha pasado del ${a0} % en 2018 al ${a1} % en lo que va de 2026.`,
    hist1B: 'Ver la evolución año a año',
    hist2T: 'Al compartirse, cada medio se aleja del centro',
    hist2P: (nAle, nFue, min, izqN, izqA, izqB, derN, derA, derB) => `Entre los ${nFue} medios con al menos ${min} tuits con lado claro tanto en el total como en los de 100 RT o más, <strong>${nAle}</strong> se desplazan hacia su propio extremo cuando se comparten. ${izqN} pasa de ${izqA} a ${izqB} en la escala; ${derN}, de ${derA} a ${derB}. No significa que el medio cambie lo que publica, sino que sus tuits más partidistas son los que más circulan.`,
    hist2B: 'Comparar en el mapa',
    hist3T: 'Pero en lo viral, la balanza se iguala',
    hist3P: (pub, vir, nI, nD, rI, rD) => `Aunque el ${pub} % de lo publicado cae a la derecha, entre los tuits con 100 RT o más el reparto es casi a partes iguales: <strong>${vir} %</strong> a la derecha (${nI} a la izquierda y ${nD} a la derecha). Se explica porque los tuits de los medios de izquierda se comparten más: el <strong>${rI} %</strong> llega a 100 RT, frente al ${rD} % en los de derecha.`,
    hist3B: 'Ver solo los de 100 RT o más',
    hist4T: 'El Gobierno es el blanco',
    hist4P: (pctPsoe, nPsoe, nResto, perj, ben, ratio) => `El <strong>${pctPsoe} %</strong> de los tuits políticos tiene al PSOE como partido afectado: ${nPsoe}, más que PP, Vox y Sumar juntos (${nResto}). Y se critica mucho más de lo que se elogia: ${perj} tuits perjudican a un partido frente a ${ben} que lo benefician, <strong>${ratio} a 1</strong>. Como el PSOE gobierna desde junio de 2018, criticar al Gobierno suma a la derecha en este índice.`,
    hist4B: 'Leer los tuits sobre el PSOE',
    mapaHint: 'Cada medio es un punto. En horizontal, su posición en la escala <strong>izquierda → derecha</strong>: 0 en el borde izquierdo significa que todos sus tuits con lado claro van a la izquierda, 100 que todos van a la derecha y 50 que se reparten por igual. El color sigue la convención española: <span class="rojo">rojo</span> a la izquierda, <span class="azul">azul</span> a la derecha y gris en el centro. La altura es el <strong>número de tuits clasificados que benefician o perjudican a un partido</strong>. El tamaño representa la <strong>mediana de retuits de esos mismos tuits</strong>. El filtro de retuits permite mostrar todos, solo los que tienen 100 RT o más, o comparar ambos subconjuntos. El eje vertical se ajusta al periodo y conserva una escala común durante la animación anual. Pasa el ratón para ver los números y pulsa para abrir sus tuits.',
    axisLeft: '◀ todo a la izquierda',
    axisMid: '% de los tuits con lado que va a la derecha',
    axisRight: 'todo a la derecha ▶',
    axisYTitle: (periodo) => `Tuits que benefician o perjudican a un partido · ${periodo}`,
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
    mapaPiePublicado: 'todos los tuits',
    mapaPieAroDiscontinuo: 'aro discontinuo',
    mapaPieLoViral: '100 RT o más',
    mapaPieFlecha: 'Flecha',
    mapaPieFlechaDesc: 'de la posición publicada a la viral: hacia dónde se desplaza el medio al compartirse',
    mapaPieAltura: 'Altura',
    mapaPieAlturaDesc: 'número de tuits clasificados que benefician o perjudican claramente a un partido.',
    mapaPieTamDesc: 'mediana de retuits de los tuits con lado claro.',
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
    tipPublicado: 'Todos',
    tipViral: '100 RT o más',
    tipSinLado: 'sin tuits con lado claro',
    tipClaros: 'claros de',
    tipPoliticos: 'tuits políticos',
    tipMuestraCorta: 'muestra corta',
    tipPctSerie: 'tuits con lado claro',
    tipDe: 'de',
    tipTuits: 'tuits',
    tipADerecha: '% a la derecha',
    tipSinLadoPct: '% sin lado',
    tipDesplazaQueda: 'Al compartirse se queda en el mismo sitio.',
    tipDesplaza: (pts, dir) => `Al compartirse se desplaza ${pts} puntos hacia la ${dir}.`,
    tipRtMedia: 'mediana de retuits',
    tipIndiceMuestra: 'índice de la muestra completa',
    backRanking: '← Volver',
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
    metodoLeerMapaP: 'El filtro de retuits permite mostrar todos los tuits, solo los que alcanzan 100 RT o más, o comparar ambos subconjuntos. El aro continuo representa todos los tuits y el discontinuo, los de 100 RT o más. La flecha parte de la posición de todos los tuits y termina en la del subconjunto de 100 RT. La altura es el número absoluto de tuits que benefician o perjudican a un partido. El tamaño de cada burbuja representa la mediana de retuits de esos mismos tuits mediante una escala de raíz cuadrada relativa al máximo, con un tamaño mínimo para que los logos se lean. El eje vertical se ajusta a la ventana seleccionada y mantiene una escala común entre 2018 y 2026 durante la animación.',
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
    footFirma: 'Datos abiertos y método a la vista.',
    footCodigo: 'Código y datos',
    footMetodo: 'Método',
    footAutor: 'victoriano.me',
    tweetRespuestas: 'respuestas',
    tweetVistas: 'vistas',
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
    ariaSerie: 'Filtro de retuits del mapa',
    ariaFiltro: 'Filtrar medios por brecha fiable o por tipo',
    ariaSearch: 'Buscar medio',
    ariaMapDesc: 'Dispersión de medios por posición en la escala izquierda-derecha, con lo publicado y lo viral y una flecha hacia donde se desplaza cada medio al compartirse',
  },
  en: {
    title: 'Bias and virality of Spanish media · victoriano.me',
    description: 'Historical map of 607,571 tweets from 68 Spanish media outlets between 2018 and 2026: published position vs viral position.',
    ogTitle: 'Bias and virality of Spanish media',
    ogDescription: '607,571 tweets from 68 outlets between 2018 and 2026, classified by party and direction, comparing published and viral.',
    kicker: 'A data analysis',
    headline: 'What is the <span class="t-mix">bias</span> of Spanish media on social media?',
    byline: 'By <strong>Victoriano Izquierdo</strong> · X data, 2018 to 2026',

    lede: (nVirales, nMedios) => `<strong id="n-virales">${nVirales}</strong> sampled tweets from <strong id="n-medios">${nMedios}</strong> outlets between 2018 and 2026, classified by which party they help or hurt. Each dot is an outlet: click it to read its tweets.`,
    tabMapa: 'Map',
    tabRanking: 'Ranking',
    descargar: '↓ Download image',
    descargaError: 'The image could not be created.',
    descargaPie: 'medios.victoriano.me · Political bias of Spanish media measured on their tweets',
    tabContenidos: 'Content',
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
    mapaTitle: 'How to read the map',
    ctlPeriodo: 'Period',
    ctlTuits: 'Tweets',
    ctlMuestra: 'Outlets',
    tipoNombre: k => ({
      prensa: 'Print press', digital: 'Digital', tv: 'Television', programa_tv: 'TV programme',
      radio: 'Radio', programa_radio: 'Radio programme', agencia: 'News agency',
    })[k] || k,
    mapaTipoOpcion: (nombre, n) => `${nombre} (${n})`,
    mapaTipoGrupo: 'By type',
    mapaPieTipoK: 'Type:',
    mapaPieTipo: nombre => `only accounts of type “${nombre}” are drawn. Television groups channels and their news desks; programmes are listed separately because they are a slot within a channel, not an outlet.`,
    mapaPeriodoAll: 'Full series',
    mapaPeriodoXV: 'XV Legislature',
    mapaSerieAmbas: 'Compare all and 100+ RT',
    mapaSeriePub: 'All tweets',
    mapaSerieViral: '100+ RT',
    mapaPlay: '▶ Evolution 2018 to 2026',
    mapaPause: (year) => `⏸ Pause · ${year}`,
    ariaPlay: 'Play or pause the yearly evolution of the map',
    trayTitulo: (nombre, a0, a1) => `Path of <strong>${nombre}</strong> from ${a0} to ${a1}`,
    traySerie: (serie) => serie === 'viral' ? 'with tweets of 100 RT or more' : 'with all tweets',
    trayFaltan: (anos) => `Sample too small in ${anos}.`,
    trayPocos: (nombre) => `${nombre} does not have enough sample in two or more years to draw its path.`,
    trayTuits: 'See its tweets →',
    trayQuitar: 'Remove ✕',
    trayAyuda: 'Click an outlet to see its path year by year.',
    mapaPieTray: 'Path',
    mapaPieTrayDesc: 'each dot is a year and the arrows go from the first to the last. The vertical axis uses the yearly scale, fitted to the outlet when viewing the full series or the legislature.',
    trayAyudaQuitar: 'Click outside the path or on «Remove» to see every outlet again.',
    ctlEjeY: 'Vertical axis',
    ctlAjustes: 'Axis and size',
    varCorta: (v) => ({ con_lado: 'For or against', ben: 'Benefit it', perj: 'Harm it', politicos: 'Political tweets',
                        tuits: 'Sampled tweets', rt_media: 'Mean RT', rt_mediana: 'Median RT' })[v],
    ctlTam: 'Size',
    ariaEjeY: 'Vertical axis variable',
    ariaTam: 'Bubble size variable',
    varOpcion: (v, p) => ({
      con_lado: p ? `Tweets for or against ${p}` : 'Tweets for or against a party',
      ben: p ? `Tweets that benefit ${p}` : 'Tweets that benefit',
      perj: p ? `Tweets that harm ${p}` : 'Tweets that harm',
      politicos: 'Political tweets by the outlet',
      tuits: 'Sampled tweets',
      rt_media: 'Mean retweets',
      rt_mediana: 'Median retweets',
    })[v],
    varDesc: (v, p) => ({
      con_lado: p ? `number of tweets that clearly benefit or harm ${p}.` : 'number of classified tweets that clearly benefit or harm a party.',
      ben: `number of tweets that benefit ${p}.`,
      perj: `number of tweets that harm ${p}.`,
      politicos: 'number of tweets by the outlet with a political reading, whether or not they take sides.',
      tuits: 'number of sampled tweets by the outlet in the chosen series.',
      rt_media: p ? `mean retweets of the tweets that benefit or harm ${p}.` : 'mean retweets among tweets with a clear side.',
      rt_mediana: p ? `median retweets of the tweets that benefit or harm ${p}.` : 'median retweets among tweets with a clear side.',
    })[v],
    varTitulo: (v, p, periodo) => `${({
      ben: `Tweets that benefit ${p}`, perj: `Tweets that harm ${p}`,
      politicos: 'Political tweets by the outlet', tuits: 'Sampled tweets',
      rt_media: 'Mean retweets', rt_mediana: 'Median retweets',
    })[v]} · ${periodo}`,
    ctlPartido: 'Party',
    ariaPartido: 'Show the outlets position towards one party',
    mapaPartidoTodos: 'Left and right',
    mapaFiltroTodos: 'All outlets',
    mapaFiltroB200: 'Reliable gap: 200 with clear side in each series',
    mapaPieFiltroTodos: 'All outlets with 5 or more tweets with clear side in the chosen series are drawn.',
    zonaMuyIzqP: () => 'strongly against',
    zonaIzqP: () => 'against',
    zonaEqP: () => 'balanced',
    zonaDerP: () => 'in favour',
    zonaMuyDerP: () => 'strongly in favour',
    axisLeftP: (p) => `◀ all against ${p}`,
    axisMidP: (p) => `% of tweets about ${p} that favour it`,
    axisRightP: (p) => `all in favour of ${p} ▶`,
    axisYTitleP: (p, periodo) => `Tweets that benefit or harm ${p} · ${periodo}`,
    mapaPieIzqP: () => 'against',
    mapaPieDerP: () => 'in favour',
    mapaPieCentroP: () => 'balanced',
    mapaPieAlturaDescP: (p) => `number of tweets that clearly benefit or harm ${p}.`,
    mapaPiePartido: (p) => `Position towards ${p}: 0 if every tweet by the outlet about ${p} harms it, 100 if every one favours it. Podemos is counted within Sumar.`,
    mapaPiePartidoK: 'Party',
    mapaResDespSuLadoP: (p, n, total) => `${n} out of ${total} move away from balance when shared.`,
    mapaResMedianaP: (p, pts, aFavor) => `The median shift is ${pts} points ${aFavor ? 'in favour of' : 'against'} ${p}.`,
    tipADerechaP: (p) => `% in favour of ${p}`,
    tipDesplazaP: (p, pts, aFavor) => `Shifts ${pts} points ${aFavor ? 'in favour of' : 'against'} ${p} when shared.`,
    histKicker: 'What the data says',
    histTitle: 'Four things the map shows',
    histIntro: 'A tweet counts to the <span class="rojo">left</span> if it helps PSOE or Sumar or hurts PP or Vox, and to the <span class="azul">right</span> otherwise. Every figure comes from the same sample the map draws.',
    hist1T: 'There are more outlets on the right than on the left',
    hist1P: (nDer, nIzq, nCen, nTot, pub, a0, a1) => `Of the ${nTot} outlets on the map, <strong>${nDer}</strong> publish mostly to the right, <strong>${nIzq}</strong> to the left and ${nCen} stay in the centre. Adding up every tweet with a clear side, <strong>${pub}%</strong> falls to the right. That share went from ${a0}% in 2018 to ${a1}% so far in 2026.`,
    hist1B: 'Watch it year by year',
    hist2T: 'When shared, every outlet drifts away from the centre',
    hist2P: (nAle, nFue, min, izqN, izqA, izqB, derN, derA, derB) => `Among the ${nFue} outlets with at least ${min} tweets with a clear side both overall and at 100 RT or more, <strong>${nAle}</strong> move towards their own extreme when shared. ${izqN} goes from ${izqA} to ${izqB} on the scale; ${derN}, from ${derA} to ${derB}. It does not mean the outlet changes what it publishes, but that its most partisan tweets are the ones that travel furthest.`,
    hist2B: 'Compare on the map',
    hist3T: 'Yet in what goes viral, the scales even out',
    hist3P: (pub, vir, nI, nD, rI, rD) => `Although ${pub}% of what is published falls to the right, among tweets with 100 RT or more the split is almost even: <strong>${vir}%</strong> to the right (${nI} to the left and ${nD} to the right). That is because tweets from left leaning outlets get shared more: <strong>${rI}%</strong> reach 100 RT, against ${rD}% for right leaning ones.`,
    hist3B: 'Show only 100 RT or more',
    hist4T: 'The Government is the target',
    hist4P: (pctPsoe, nPsoe, nResto, perj, ben, ratio) => `<strong>${pctPsoe}%</strong> of political tweets have PSOE as the affected party: ${nPsoe}, more than PP, Vox and Sumar combined (${nResto}). And criticism far outweighs praise: ${perj} tweets hurt a party against ${ben} that help one, <strong>${ratio} to 1</strong>. Since PSOE has led the Government since June 2018, criticising the Government counts to the right in this index.`,
    hist4B: 'Read the tweets about PSOE',
    mapaHint: 'Each outlet is a dot. Horizontally, 0 means all tweets with a clear side go left, 100 means all go right, and 50 is evenly split. Color follows Spanish convention: <span class="rojo">red</span> for left, <span class="azul">blue</span> for right, and gray for center. Height is the <strong>number of classified tweets that benefit or harm a party</strong>. Size represents the <strong>median retweets of those same tweets</strong>. The retweet filter shows all tweets, only tweets with 100+ RT, or compares both subsets. The vertical scale adapts to the selected period and remains fixed during the yearly animation. Hover for figures and click to open the tweets.',
    axisLeft: '◀ all to the left',
    axisMid: '% of tweets with clear side going right',
    axisRight: 'all to the right ▶',
    axisYTitle: (periodo) => `Tweets that benefit or harm a party · ${periodo}`,
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
    mapaPiePublicado: 'all tweets',
    mapaPieAroDiscontinuo: 'dashed ring',
    mapaPieLoViral: '100+ RT',
    mapaPieFlecha: 'Arrow',
    mapaPieFlechaDesc: 'from published position to viral: where the outlet shifts when shared',
    mapaPieAltura: 'Height',
    mapaPieAlturaDesc: 'number of classified tweets that clearly benefit or harm a party.',
    mapaPieTamDesc: 'median retweets among tweets with a clear side.',
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
    tipPublicado: 'All tweets',
    tipViral: '100+ RT',
    tipSinLado: 'no tweets with clear side',
    tipClaros: 'clear of',
    tipPoliticos: 'political tweets',
    tipMuestraCorta: 'short sample',
    tipPctSerie: 'tweets with clear side',
    tipDe: 'of',
    tipTuits: 'tweets',
    tipADerecha: '% to the right',
    tipSinLadoPct: '% neutral',
    tipDesplazaQueda: 'Stays in the same place when shared.',
    tipDesplaza: (pts, dir) => `Shifts ${pts} points toward the ${dir} when shared.`,
    tipRtMedia: 'median retweets',
    tipIndiceMuestra: 'full sample index',
    backRanking: '← Back',
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
    metodoLeerMapaP: 'The retweet filter shows all tweets, only those reaching 100 RT or more, or compares both subsets. The solid ring represents all tweets and the dashed ring represents those with 100+ RT. The arrow starts at the all tweets position and ends at the 100+ RT position. Height is the absolute number of tweets that benefit or harm a party. Bubble size represents the median retweets of those same tweets through a square root scale relative to the maximum, with a minimum size so logos stay readable. The vertical axis adapts to the selected window and keeps a common scale from 2018 to 2026 during the animation.',
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
    footFirma: 'Open data, method in plain sight.',
    footCodigo: 'Code and data',
    footMetodo: 'Method',
    footAutor: 'victoriano.me',
    tweetRespuestas: 'replies',
    tweetVistas: 'views',
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
    ariaSerie: 'Map retweet filter',
    ariaFiltro: 'Filter outlets by reliable gap or by type',
    ariaSearch: 'Search outlet',
    ariaMapDesc: 'Media scatter by left-right position, with published and viral positions and an arrow showing where each outlet shifts when shared',
  }
};
/* textos de la historia guiada, el panel de tuits y los controles simplificados del mapa */
Object.assign(I18N.es, {
  ctlEje: 'Eje',
  ctlMuestra: 'Cuentas',
  ctlAjustes: 'Más ajustes',
  mapaPartidoTodos: 'Izq. y der.',
  mapaPlay: '▶ Por años',
  mapaPause: year => `⏸ ${year}`,
  ariaFiltro: 'Qué cuentas se dibujan',
  mapaCuentasTodas: n => `Todas las cuentas (${n})`,
  mapaCuentasGen: n => `Generalistas (${n})`,
  mapaCuentasProg: n => `Programas (${n})`,
  mapaFiltroB200: 'Solo brecha fiable: 200 con lado en cada serie',
  mapaPieCuentasK: 'Cuentas:',
  mapaPieCuentas: k => k === 'generalistas'
    ? 'solo medios generalistas: prensa, digitales, televisiones, radios y agencias, sin las cuentas de programas concretos.'
    : 'solo cuentas de programas de televisión y radio, que son espacios dentro de una cadena y cuentan aparte de ella.',
  mapaPieDestacar: 'Los programas van destacados; el resto de cuentas, atenuadas.',
  ajustesResumen: n => n ? `⚙ Ajustes · ${n}` : '⚙ Ajustes',
  relatoPaso: (i, n) => `${i} / ${n}`,
  relatoSig: 'Siguiente →',
  relatoFin: 'Seguir leyendo ↓',
  relatoAnt: 'Paso anterior',
  relatoIr: i => `Ir al paso ${i}`,
  relatoSalir: 'Explorar por libre ✕',
  relatoVolver: '▶ Ver la historia',
  relatoPista: 'También puedes avanzar haciendo scroll. El mapa se puede tocar en cada paso.',
  relato1T: 'Empecemos por los medios generalistas',
  relato1P: (n, izq, der, neu, dist) => `Periódicos, digitales, televisiones, radios y agencias: <strong>${n}</strong> cuentas. <strong>${der}</strong> publican sobre todo a la derecha, <strong>${izq}</strong> a la izquierda y ${neu} quedan en el centro. De media, cada una está a <strong>${dist} puntos</strong> del equilibrio.`,
  relato2T: 'Ahora sumamos los programas',
  relato2P: (n, dProg, dGen, der, izq) => `Las ${n} cuentas de programas de televisión y radio, destacadas en el mapa, están más lejos del centro: de media a <strong>${dProg} puntos</strong> del equilibrio, frente a ${dGen} de los medios generalistas.${der ? ` ${der.nombre} tiene el <strong>${der.v} %</strong> de sus tuits con lado claro a la derecha` : ''}${izq ? `${der ? ';' : ''} ${izq.nombre}, el <strong>${izq.v} %</strong> a la izquierda` : ''}.`,
  relato3T: 'Cada cuenta tiene su recorrido',
  relato3P: (nombre, a0, p0, a1, p1) => `Pulsa una cuenta y verás cómo se ha movido año a año. ${nombre} pasó de tener el <strong>${p0} %</strong> de sus tuits con lado claro a la derecha en ${a0} al <strong>${p1} %</strong> en ${a1}. Pulsa un año del recorrido para leer los tuits de ese año.`,
  relato3B: nombre => `Leer los tuits de ${nombre} →`,
  relato4T: 'También respecto a cada partido',
  relato4P: (p, nContra, nTot) => `El eje puede medir a quién favorece cada medio. Con ${elP(p)} elegido, 0 es todo en contra y 100 todo a favor. <strong>${nContra}</strong> de ${nTot} cuentas publican más en contra ${delP(p)} que a su favor. Prueba arriba con otro partido.`,
  relato5T: 'Ahora, explora tú',
  relato5P: () => `<ul><li>Elige un <strong>periodo</strong> o pulsa ▶ para ver la evolución de 2018 a 2026.</li><li>Cambia el <strong>eje</strong> a un partido o filtra las <strong>cuentas</strong>.</li><li>Pulsa una cuenta para ver su <strong>recorrido</strong> y leer sus <strong>tuits</strong>.</li><li>En <strong>Más ajustes</strong>, compara lo publicado con lo viral.</li></ul>`,
  relatoCargando: 'Cargando…',
  ariaCajon: 'Tuits de la cuenta',
  cajonFicha: 'Ficha completa ↗',
  cajonCerrar: 'Cerrar',
  cajonCargando: 'Cargando sus tuits…',
  cajonError: 'No se han podido cargar los tuits.',
  cajonBuscar: 'Buscar en sus tuits…',
  cajonPartido: 'Partido',
  cajonSentido: 'Sentido',
  cajonTodos: 'Todos',
  cajonOtros: 'Otros',
  cajonAno: 'Año',
  cajonTodosAnos: 'Todos los años',
  cajonOrden: 'Orden',
  cajonOrdenOp: k => ({ peso: 'Lo que más pesa en su lado', rt: 'Más retuits', lk: 'Más me gusta', vw: 'Más vistas', f: 'Más recientes', fa: 'Más antiguos' })[k],
  cajonSoloPol: 'Solo tuits políticos',
  cajonDir: (d, p) => ({ beneficia: p ? `A favor ${delP(p)}` : 'A favor', perjudica: p ? `En contra ${delP(p)}` : 'En contra', neutro: 'Neutros' })[d],
  cajonResumen: (n, izq, der, neu) => `<strong>${n}</strong> tuits · <span class="c-izq">${izq} a la izquierda</span> · <span class="c-der">${der} a la derecha</span> · ${neu} sin lado`,
  cajonRecorrido: (a0, p0, a1, p1, p) => p
    ? `Recorrido: del ${p0} % a favor ${delP(p)} en ${a0} al ${p1} % en ${a1}.`
    : `Recorrido: del ${p0} % de tuits con lado a la derecha en ${a0} al ${p1} % en ${a1}.`,
  cajonVacio: 'Ningún tuit coincide con estos filtros.',
  cajonMas: n => `Ver ${n} más`,
  dgMotivo: (p, d, v) => d === 'perjudica' ? `critica ${alP(p)} (${v})` : `habla bien ${delP(p)} (${v})`,
  dgTuits: n => `${n}\u00a0tuits`,
  dgModo: m => m === 'n' ? 'Tuits' : '%',
  dgModoAria: 'Ver en número de tuits o en porcentaje',
  dgFrase: (lado, pc, top) => `Sale a la <strong>${lado === 'izq' ? 'izquierda' : 'derecha'}</strong> sobre todo porque ${top.join(' y ')}.`,
  dgCorto: d => d === 'perjudica' ? 'contra' : 'a favor',
  dgTitulo: (p, d, n) => `${n} tuits ${d === 'perjudica' ? 'en contra' : 'a favor'} ${delP(p)}`,
  dgLados: (i, d) => `${i} % a la izquierda y ${d} % a la derecha`,
  dgEjeIzq: 'lo lleva a la izquierda',
  dgEjeDer: 'lo lleva a la derecha',
  dgNota: n => `Sobre ${n} tuits con lado claro.`,
  dgPulsa: 'Pulsa una barra para leer esos tuits.',
  dgGrupo: (p, d) => d === 'perjudica' ? `Critica ${alP(p)}` : `Habla bien ${delP(p)}`,
  dgGrupoSin: 'Sin lado claro',
  dgGrupoN: (n, pc) => pc == null ? `${n} tuits` : `${n} tuits · ${pc} % de los que tienen lado`,
});
Object.assign(I18N.en, {
  ctlEje: 'Axis',
  ctlMuestra: 'Accounts',
  ctlAjustes: 'More settings',
  mapaPartidoTodos: 'Left & right',
  mapaPlay: '▶ By year',
  mapaPause: year => `⏸ ${year}`,
  ariaFiltro: 'Which accounts are drawn',
  mapaCuentasTodas: n => `All accounts (${n})`,
  mapaCuentasGen: n => `General news (${n})`,
  mapaCuentasProg: n => `Shows (${n})`,
  mapaFiltroB200: 'Reliable gap only: 200 with clear side in each series',
  mapaPieCuentasK: 'Accounts:',
  mapaPieCuentas: k => k === 'generalistas'
    ? 'general news outlets only: newspapers, digital outlets, TV channels, radio stations and agencies, without the accounts of specific shows.'
    : 'TV and radio show accounts only; they are slots inside a channel and are counted apart from it.',
  mapaPieDestacar: 'Shows are highlighted; every other account is faded.',
  ajustesResumen: n => n ? `⚙ Settings · ${n}` : '⚙ Settings',
  relatoPaso: (i, n) => `${i} / ${n}`,
  relatoSig: 'Next →',
  relatoFin: 'Keep reading ↓',
  relatoAnt: 'Previous step',
  relatoIr: i => `Go to step ${i}`,
  relatoSalir: 'Explore freely ✕',
  relatoVolver: '▶ See the story',
  relatoPista: 'You can also move on by scrolling. The map is live at every step.',
  relato1T: 'Let us start with the general news outlets',
  relato1P: (n, izq, der, neu, dist) => `Newspapers, digital outlets, TV, radio and agencies: <strong>${n}</strong> accounts. <strong>${der}</strong> publish mostly to the right, <strong>${izq}</strong> to the left and ${neu} sit in the centre. On average each one is <strong>${dist} points</strong> away from balance.`,
  relato2T: 'Now we add the shows',
  relato2P: (n, dProg, dGen, der, izq) => `The ${n} TV and radio show accounts, highlighted on the map, sit further from the centre: on average <strong>${dProg} points</strong> from balance, against ${dGen} for general news outlets.${der ? ` ${der.nombre} has <strong>${der.v} %</strong> of its clear side tweets on the right` : ''}${izq ? `${der ? ';' : ''} ${izq.nombre}, <strong>${izq.v} %</strong> on the left` : ''}.`,
  relato3T: 'Every account has its own path',
  relato3P: (nombre, a0, p0, a1, p1) => `Click an account to see how it moved year by year. ${nombre} went from <strong>${p0} %</strong> of its clear side tweets on the right in ${a0} to <strong>${p1} %</strong> in ${a1}. Click a year on the path to read that year's tweets.`,
  relato3B: nombre => `Read ${nombre}'s tweets →`,
  relato4T: 'And for each party',
  relato4P: (p, nContra, nTot) => `The axis can also measure who each outlet favours. With ${p} selected, 0 is all against and 100 all in favour. <strong>${nContra}</strong> of ${nTot} accounts publish more against ${p} than in its favour. Try another party above.`,
  relato5T: 'Now it is your turn',
  relato5P: () => `<ul><li>Pick a <strong>period</strong> or press ▶ to watch 2018 to 2026.</li><li>Switch the <strong>axis</strong> to a party or filter the <strong>accounts</strong>.</li><li>Click an account to see its <strong>path</strong> and read its <strong>tweets</strong>.</li><li>In <strong>More settings</strong>, compare everything with what went viral.</li></ul>`,
  relatoCargando: 'Loading…',
  ariaCajon: 'Account tweets',
  cajonFicha: 'Full page ↗',
  cajonCerrar: 'Close',
  cajonCargando: 'Loading its tweets…',
  cajonError: 'The tweets could not be loaded.',
  cajonBuscar: 'Search its tweets…',
  cajonPartido: 'Party',
  cajonSentido: 'Direction',
  cajonTodos: 'All',
  cajonOtros: 'Other',
  cajonAno: 'Year',
  cajonTodosAnos: 'All years',
  cajonOrden: 'Sort',
  cajonOrdenOp: k => ({ peso: 'What weighs most in its lean', rt: 'Most retweets', lk: 'Most likes', vw: 'Most views', f: 'Newest', fa: 'Oldest' })[k],
  cajonSoloPol: 'Political tweets only',
  cajonDir: (d, p) => ({ beneficia: p ? `For ${p}` : 'For', perjudica: p ? `Against ${p}` : 'Against', neutro: 'Neutral' })[d],
  cajonResumen: (n, izq, der, neu) => `<strong>${n}</strong> tweets · <span class="c-izq">${izq} left</span> · <span class="c-der">${der} right</span> · ${neu} no side`,
  cajonRecorrido: (a0, p0, a1, p1, p) => p
    ? `Path: from ${p0} % for ${p} in ${a0} to ${p1} % in ${a1}.`
    : `Path: from ${p0} % of clear side tweets on the right in ${a0} to ${p1} % in ${a1}.`,
  cajonVacio: 'No tweet matches these filters.',
  cajonMas: n => `Show ${n} more`,
  dgMotivo: (p, d, v) => d === 'perjudica' ? `criticises ${p} (${v})` : `speaks well of ${p} (${v})`,
  dgTuits: n => `${n}\u00a0tweets`,
  dgModo: m => m === 'n' ? 'Tweets' : '%',
  dgModoAria: 'Show as number of tweets or as a percentage',
  dgFrase: (lado, pc, top) => `Leans <strong>${lado === 'izq' ? 'left' : 'right'}</strong> mainly because it ${top.join(' and ')}.`,
  dgCorto: d => d === 'perjudica' ? 'against' : 'for',
  dgTitulo: (p, d, n) => `${n} tweets ${d === 'perjudica' ? 'against' : 'for'} ${p}`,
  dgLados: (i, d) => `${i} % left and ${d} % right`,
  dgEjeIzq: 'pulls it left',
  dgEjeDer: 'pulls it right',
  dgNota: n => `Out of ${n} tweets with a clear side.`,
  dgPulsa: 'Click a bar to read those tweets.',
  dgGrupo: (p, d) => d === 'perjudica' ? `Criticises ${p}` : `Speaks well of ${p}`,
  dgGrupoSin: 'No clear side',
  dgGrupoN: (n, pc) => pc == null ? `${n} tweets` : `${n} tweets · ${pc} % of those with a side`,
});
Object.assign(I18N.es, {
  contTitulo: 'Contenidos',
  contHint: (n, corte, tot) => `Busca entre los <strong>${n}</strong> tuits que llegaron a ${corte} retuits o más, de cualquier medio y con o sin lectura política. Elige un medio para buscar en toda su muestra, no solo en lo viral. La serie completa tiene ${tot} tuits.`,
  contHintMedio: (nombre, n, corte) => `Los <strong>${n}</strong> tuits de ${nombre} con ${corte} retuits o más. Marca la casilla de abajo para buscar en toda su muestra.`,
  contHintTodo: (nombre, n) => `Toda la muestra de ${nombre}: <strong>${n}</strong> tuits, hasta 100 por mes. Es una muestra, no todo lo que ha publicado.`,
  contBuscar: 'Buscar texto, persona o tema…',
  contMedio: 'Medio',
  contTodosMedios: 'Todos los medios',
  contTipo: 'Tipo de medio',
  contTodosTipos: 'Todos los tipos',
  contTodo: n => `Toda su muestra (${n} tuits), no solo los de 100 RT o más`,
  contCargando: 'Cargando los tuits…',
});
Object.assign(I18N.en, {
  contTitulo: 'Content',
  contHint: (n, corte, tot) => `Search the <strong>${n}</strong> tweets that reached ${corte} retweets or more, from any outlet, political or not. Pick an outlet to search its whole sample, not only what went viral. The full series has ${tot} tweets.`,
  contHintMedio: (nombre, n, corte) => `The <strong>${n}</strong> tweets from ${nombre} with ${corte} retweets or more. Tick the box below to search its whole sample.`,
  contHintTodo: (nombre, n) => `The whole sample for ${nombre}: <strong>${n}</strong> tweets, up to 100 per month. It is a sample, not everything it published.`,
  contBuscar: 'Search text, people or topics…',
  contMedio: 'Outlet',
  contTodosMedios: 'All outlets',
  contTipo: 'Outlet type',
  contTodosTipos: 'All types',
  contTodo: n => `Its whole sample (${n} tweets), not only those with 100 RT or more`,
  contCargando: 'Loading tweets…',
});
Object.assign(I18N.es, {
  tabTendencias: 'Tendencias',
  tdTitulo: 'Tendencias',
  tdAria: 'Evolución de cada medio a lo largo del tiempo',
  tdHint: (medida, sub) => `Cómo cambia, año a año o mes a mes, <strong>${medida}</strong> de cada medio, contando ${sub}. Destaca los que más crecen o más caen, o elige los medios que quieras en el desplegable o en la tabla. Pasa el ratón para ver las cifras.`,
  tdMedida: 'Medida',
  tdMedidaOp: k => ({ rt_mediana: 'Mediana de retuits', rt_media: 'Media de retuits', lk_mediana: 'Mediana de me gusta', n: 'Número de tuits', pct: '% de sus tuits' })[k],
  tdMedidaFrase: k => ({ rt_mediana: 'la mediana de retuits', rt_media: 'la media de retuits', lk_mediana: 'la mediana de me gusta', n: 'el número de tuits', pct: 'el porcentaje de sus tuits' })[k],
  tdTuits: 'Tuits',
  tdSubOp: k => {
    const fijos = { todos: 'Todos los tuits', politicos: 'Tuits políticos', izq: 'A favor de la izquierda', der: 'A favor de la derecha' };
    if (fijos[k]) return fijos[k];
    const p = k.slice(0, -1);
    return k.endsWith('+') ? `A favor ${delP(p)}` : `En contra ${delP(p)}`;
  },
  tdSubFrase: k => {
    const fijos = { todos: 'todos sus tuits', politicos: 'solo sus tuits políticos', izq: 'solo los tuits que benefician a PSOE o Sumar o perjudican a PP o Vox', der: 'solo los tuits que benefician a PP o Vox o perjudican a PSOE o Sumar' };
    if (fijos[k]) return fijos[k];
    const p = k.slice(0, -1);
    return k.endsWith('+') ? `solo los tuits que benefician ${alP(p)}` : `solo los tuits que perjudican ${alP(p)}`;
  },
  tdGrupoLados: 'Corriente',
  tdGrupoPartidos: 'Partido',
  tdCuentas: 'Cuentas',
  tdVer: 'Ver por',
  tdAno: 'Año',
  tdMes: 'Mes',
  tdLog: 'Escala logarítmica',
  tdElegidos: 'En el gráfico',
  tdAnadir: 'Añadir medio…',
  tdDestacar: n => `Destacar ${n}`,
  tdDestacarOp: (k, n) => ({ altos: 'Más altos', crecen: 'Más crecen', caen: 'Más caen' })[k],
  tdColPend: 'Tendencia',
  tdColPendTip: 'Cuánto sube o baja cada año, según la recta que mejor se ajusta a sus valores anuales (con al menos tres años)',
  tdTipPend: v => `Tendencia: ${v} al año`,
  tdQuitar: nombre => `Quitar ${nombre}`,
  tdLleno: n => `Caben ${n} medios a la vez`,
  tdCargando: 'Cargando los datos…',
  tdError: 'No se han podido cargar los datos de tendencias.',
  tdSinDatos: 'Ningún medio tiene datos con estos filtros.',
  tdSinSel: 'Elige al menos un medio en el desplegable o en la tabla.',
  tdSinDatosSel: 'Los medios elegidos no tienen datos con estos filtros.',
  tdNota: (min, gran) => `Es una muestra de hasta 100 tuits por medio y mes, no todo lo publicado. Las medianas y medias solo se dibujan con al menos ${min} tuits en el ${gran === 'mes' ? 'mes' : 'año'}. 2018 empieza en mayo y 2026 acaba en septiembre, así que en número de tuits esos dos años salen más bajos. Los retuits y me gusta son los que tenía cada tuit al descargarlo, en 2026. La tendencia es la pendiente de la recta que mejor se ajusta a los valores anuales de cada medio, con al menos tres años; en número de tuits no cuenta 2018 ni 2026.`,
  tdTipN: (n, total) => `${n} de ${total} tuits muestreados`,
  tdTipPocos: (n, min) => `${n} tuits, menos de ${min}: sin cifra`,
  tdTipPulsa: 'Pulsa para añadirlo al gráfico',
  tdTipQuita: 'Pulsa para quitarlo del gráfico',
  tdNoticias: 'Noticias políticas',
  tdNoticiasOp: k => ({ no: 'No mostrar', grandes: 'Elecciones y corrupción', elecciones: 'Solo elecciones', corrupcion: 'Solo corrupción', clave: 'Las de mayor relevancia', todas: 'Todas' })[k],
  tdNoticiasGrandes: 'Grandes eventos',
  tdNoticiasMas: 'Más noticias',
  tdNoticiasGrupo: k => ({ elecciones: 'elecciones', corrupcion: 'corrupción', otras: 'otras' })[k],
  tdNoticiasPulsa: 'Pulsa para verla en la lista',
  tdNoticiasLista: n => `Las ${n} noticias del gráfico, por fecha`,
  tdNoticiasFuente: 'Acontecimientos de la política española seleccionados para el proyecto <a href="https://github.com/victoriano/barometro-cis-viz" target="_blank" rel="noopener">de los barómetros del CIS</a>, con su relevancia y a quién beneficiaron o perjudicaron previsiblemente. Elecciones son las generales, autonómicas, municipales y europeas; corrupción, los casos y escándalos. Las de mayor relevancia son las que el proyecto puntúa con un 5 sobre 5. Que una noticia coincida con un cambio en la línea no demuestra que lo cause.',
  tdTablaTitulo: 'Año a año',
  tdTablaHint: 'Pulsa un medio para añadirlo al gráfico o quitarlo. Pulsa la cabecera de un año para ordenar.',
  tdColMedio: 'Medio',
  tdColMedia: 'Promedio',
  tdColMediaTip: 'Promedio de los años con cifra',
});
Object.assign(I18N.en, {
  tabTendencias: 'Trends',
  tdTitulo: 'Trends',
  tdAria: 'How each outlet changes over time',
  tdHint: (medida, sub) => `How <strong>${medida}</strong> changes for each outlet, year by year or month by month, counting ${sub}. Highlight the ones rising or falling most, or pick outlets from the menu or the table. Hover to see the numbers.`,
  tdMedida: 'Measure',
  tdMedidaOp: k => ({ rt_mediana: 'Median retweets', rt_media: 'Mean retweets', lk_mediana: 'Median likes', n: 'Number of tweets', pct: '% of its tweets' })[k],
  tdMedidaFrase: k => ({ rt_mediana: 'the median retweets', rt_media: 'the mean retweets', lk_mediana: 'the median likes', n: 'the number of tweets', pct: 'the share of its tweets' })[k],
  tdTuits: 'Tweets',
  tdSubOp: k => {
    const fijos = { todos: 'All tweets', politicos: 'Political tweets', izq: 'For the left', der: 'For the right' };
    if (fijos[k]) return fijos[k];
    const p = k.slice(0, -1);
    return k.endsWith('+') ? `For ${p}` : `Against ${p}`;
  },
  tdSubFrase: k => {
    const fijos = { todos: 'all its tweets', politicos: 'only its political tweets', izq: 'only tweets that help PSOE or Sumar or hurt PP or Vox', der: 'only tweets that help PP or Vox or hurt PSOE or Sumar' };
    if (fijos[k]) return fijos[k];
    const p = k.slice(0, -1);
    return k.endsWith('+') ? `only tweets that help ${p}` : `only tweets that hurt ${p}`;
  },
  tdGrupoLados: 'Side',
  tdGrupoPartidos: 'Party',
  tdCuentas: 'Accounts',
  tdVer: 'View by',
  tdAno: 'Year',
  tdMes: 'Month',
  tdLog: 'Log scale',
  tdElegidos: 'On the chart',
  tdAnadir: 'Add outlet…',
  tdDestacar: n => `Highlight ${n}`,
  tdDestacarOp: (k, n) => ({ altos: 'Highest', crecen: 'Rising most', caen: 'Falling most' })[k],
  tdColPend: 'Trend',
  tdColPendTip: 'How much it rises or falls per year, from the line that best fits its yearly values (at least three years)',
  tdTipPend: v => `Trend: ${v} per year`,
  tdQuitar: nombre => `Remove ${nombre}`,
  tdLleno: n => `Up to ${n} outlets at once`,
  tdCargando: 'Loading data…',
  tdError: 'The trends data could not be loaded.',
  tdSinDatos: 'No outlet has data with these filters.',
  tdSinSel: 'Pick at least one outlet from the menu or the table.',
  tdSinDatosSel: 'The outlets you picked have no data with these filters.',
  tdNota: (min, gran) => `This is a sample of up to 100 tweets per outlet and month, not everything published. Medians and means are only drawn with at least ${min} tweets in the ${gran === 'mes' ? 'month' : 'year'}. 2018 starts in May and 2026 ends in September, so those two years look lower in number of tweets. Retweets and likes are what each tweet had when it was downloaded, in 2026. The trend is the slope of the line that best fits each outlet's yearly values, with at least three years; for number of tweets it leaves out 2018 and 2026.`,
  tdTipN: (n, total) => `${n} of ${total} sampled tweets`,
  tdTipPocos: (n, min) => `${n} tweets, fewer than ${min}: no figure`,
  tdTipPulsa: 'Click to add it to the chart',
  tdTipQuita: 'Click to remove it from the chart',
  tdNoticias: 'Political news',
  tdNoticiasOp: k => ({ no: 'Hide', grandes: 'Elections and corruption', elecciones: 'Elections only', corrupcion: 'Corruption only', clave: 'Most relevant', todas: 'All' })[k],
  tdNoticiasGrandes: 'Major events',
  tdNoticiasMas: 'More news',
  tdNoticiasGrupo: k => ({ elecciones: 'elections', corrupcion: 'corruption', otras: 'other' })[k],
  tdNoticiasPulsa: 'Click to see it in the list',
  tdNoticiasLista: n => `The ${n} news events on the chart, by date`,
  tdNoticiasFuente: 'Spanish political events selected for the <a href="https://github.com/victoriano/barometro-cis-viz" target="_blank" rel="noopener">CIS barometers project</a>, with their relevance and who they likely helped or hurt (text in Spanish). Elections cover general, regional, local and European votes; corruption, the cases and scandals. The most relevant are those the project scores 5 out of 5. A news event lining up with a change in a line does not prove it caused it.',
  tdTablaTitulo: 'Year by year',
  tdTablaHint: 'Click an outlet to add it to the chart or remove it. Click a year header to sort.',
  tdColMedio: 'Outlet',
  tdColMedia: 'Average',
  tdColMediaTip: 'Average of the years with a figure',
});
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
/* ---------- por qué sale a un lado ----------
   Cada tuit con lado claro empuja hacia un lado: a la izquierda los que hablan
   bien del PSOE o de Sumar y los que critican al PP o a Vox; a la derecha, al
   revés. Estas ocho casillas suman exactamente izq + der, así que el desglose
   explica el mismo índice que dibuja el mapa. */
const PARTIDOS_LADO = ['PSOE', 'Sumar', 'PP', 'Vox'];
const IZQ_P = { PSOE: 1, Sumar: 1 };
// lado al que empuja un tuit: 'izq', 'der' o '' si no tiene lado claro
function empujeDe(p, d) {
  if (!PARTIDOS_LADO.includes(p) || (d !== 'beneficia' && d !== 'perjudica')) return '';
  return (d === 'beneficia') === !!IZQ_P[p] ? 'izq' : 'der';
}
const casillasVacias = () => Object.fromEntries(PARTIDOS_LADO.map(p => [p, { beneficia: 0, perjudica: 0 }]));
function casillasDeTuits(tweets) {
  const c = casillasVacias();
  for (const tw of tweets) if (empujeDe(tw.p, tw.d)) c[tw.p][tw.d]++;
  return c;
}
// fila de partidos.json: [ben, perj, ...] por partido; i = 0 todos los tuits, 1 los de 100 RT o más
function casillasDeFila(fila, i) {
  const c = casillasVacias();
  for (const p of PARTIDOS_LADO) {
    const v = fila && fila[p] && fila[p][i];
    if (v) { c[p].beneficia = v[0] || 0; c[p].perjudica = v[1] || 0; }
  }
  return c;
}
function lecturaCasillas(c) {
  const celdas = [];
  for (const p of PARTIDOS_LADO) for (const d of ['perjudica', 'beneficia']) {
    celdas.push({ p, d, lado: empujeDe(p, d), n: c[p][d] });
  }
  const izq = celdas.filter(x => x.lado === 'izq').reduce((s, x) => s + x.n, 0);
  const der = celdas.filter(x => x.lado === 'der').reduce((s, x) => s + x.n, 0);
  return { izq, der, claro: izq + der, celdas: celdas.sort((a, b) => b.n - a.n) };
}
// la frase que lo explica: las dos casillas que más pesan del lado que gana
function fraseDesglose(l) {
  if (!l.claro) return '';
  const lado = l.izq >= l.der ? 'izq' : 'der';
  const pc = n => Math.round(100 * n / l.claro);
  const top = l.celdas.filter(x => x.lado === lado && x.n && pc(x.n) >= 1).slice(0, 2)
    .map(x => t('dgMotivo', x.p, x.d, DG_MODO === 'n' ? t('dgTuits', nf(x.n)) : `${pc(x.n)}\u00a0%, ${t('dgTuits', nf(x.n))}`));
  return t('dgFrase', lado, Math.round(100 * l[lado] / l.claro), top);
}
/* El desglose se lee en porcentaje de los tuits con lado claro (por defecto,
   con el número de tuits al lado) o solo en número de tuits. Las barras usan
   la misma escala en las dos mitades. */
let DG_MODO = 'pc';
try { if (localStorage.getItem('mv-dg') === 'n') DG_MODO = 'n'; } catch (e) {}
function fijarModoDesglose(m) {
  DG_MODO = m === 'pc' ? 'pc' : 'n';
  try { localStorage.setItem('mv-dg', DG_MODO); } catch (e) {}
}
/* Barra de los dos lados y gráfico de mariposa: una fila por partido, a la
   izquierda lo que lo empuja a la izquierda y a la derecha lo contrario. Con
   `clic`, cada barra es un botón que filtra por ese partido y sentido. */
function htmlDesglose(c, { clic = false, activo = null, resalta = '', frase = true, nota = true } = {}) {
  const l = lecturaCasillas(c);
  if (!l.claro) return '';
  const pc = n => 100 * n / l.claro;
  const max = Math.max(...l.celdas.map(x => x.n), 1);
  const filas = PARTIDOS_LADO.slice().sort((a, b) => (c[b].beneficia + c[b].perjudica) - (c[a].beneficia + c[a].perjudica));
  const barra = (p, d) => {
    const n = c[p][d], lado = empujeDe(p, d);
    const on = activo && activo.p === p && activo.d === d;
    const v = pc(n);
    const cifra = DG_MODO === 'n' ? nf(n) : `${n && v < 1 ? '&lt;1' : fx(v)} %</b> <small>· ${nf(n)}</small><b>`;
    const etq = `<span class="dg-n">${t('dgCorto', d)} <b>${cifra}</b></span>`;
    const cuerpo = `<span class="dg-t"><i style="width:${(100 * n / max).toFixed(1)}%"></i></span>${etq}`;
    const tit = esc(t('dgTitulo', p, d, nf(n)));
    return clic && n
      ? `<button type="button" class="dg-b ${lado}${on ? ' is-on' : ''}" data-dgp="${p}" data-dgd="${d}" aria-pressed="${on}" title="${tit}">${cuerpo}</button>`
      : `<span class="dg-b ${lado}${n ? '' : ' cero'}" title="${tit}">${cuerpo}</span>`;
  };
  const ladoIzq = p => IZQ_P[p] ? 'beneficia' : 'perjudica';
  const ladoDer = p => IZQ_P[p] ? 'perjudica' : 'beneficia';
  const izqPc = Math.round(pc(l.izq));
  return `<div class="dg${resalta ? ' con-resalte' : ''}">
    <div class="dg-lados" role="img" aria-label="${esc(t('dgLados', izqPc, 100 - izqPc))}">
      <span class="dg-li" style="flex:${l.izq}">${DG_MODO === 'n' ? `${nf(l.izq)} ${t('izquierda')}` : `${izqPc} % ${t('izquierda')} <small>· ${nf(l.izq)}</small>`}</span><span class="dg-ld" style="flex:${l.der}">${DG_MODO === 'n' ? `${nf(l.der)} ${t('derecha')}` : `${100 - izqPc} % ${t('derecha')} <small>· ${nf(l.der)}</small>`}</span>
    </div>
    ${frase ? `<p class="dg-frase">${fraseDesglose(l)}</p>` : ''}
    ${clic ? `<div class="dg-modo" role="group" aria-label="${esc(t('dgModoAria'))}">${['n', 'pc'].map(m =>
      `<button type="button" data-dgmodo="${m}" aria-pressed="${DG_MODO === m}"${DG_MODO === m ? ' class="is-on"' : ''}>${t('dgModo', m)}</button>`).join('')}</div>` : ''}
    <div class="dg-ejes"><span>◀ ${t('dgEjeIzq')}</span><span>${t('dgEjeDer')} ▶</span></div>
    ${filas.map(p => `<div class="dg-fila${resalta && resalta !== p ? ' tenue' : ''}">
      <div class="dg-mitad izq">${barra(p, ladoIzq(p))}</div>
      <span class="dg-p ${CHIP[p]}">${p}</span>
      <div class="dg-mitad der">${barra(p, ladoDer(p))}</div>
    </div>`).join('')}
    ${nota ? `<p class="dg-nota">${t('dgNota', nf(l.claro))}</p>` : ''}
  </div>`;
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
const VIEWS = ['ranking', 'tendencias', 'mapa', 'medio', 'contenidos', 'metodo'];
const PERIODOS_VALIDOS = ['todo', 'xv', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];
let currentView = 'mapa';
let vistaPrevia = 'mapa';
function show(v) {
  if (v === 'medio' && currentView !== 'medio') vistaPrevia = currentView;
  currentView = v;
  document.body.dataset.view = v;
  if (v !== 'mapa') { pararEvolucion(); cerrarCajon(); }
  // el recorrido sobrevive a la ida y vuelta a la ficha del medio, no a cambiar de sección
  if (v !== 'mapa' && v !== 'medio') mapaTrayectoria = '';
  VIEWS.forEach(x => { $('#view-' + x).hidden = x !== v; });
  $$('.tab').forEach(el => el.classList.toggle('is-on', el.dataset.view === v));
  // en móvil las pestañas no caben y se desplazan: la activa se deja a la vista
  const activa = $('.tab.is-on'), barra = $('.tabs');
  if (activa && barra && barra.scrollWidth > barra.clientWidth) {
    const x = activa.getBoundingClientRect().left - barra.getBoundingClientRect().left + barra.scrollLeft;
    barra.scrollLeft = Math.max(0, x - (barra.clientWidth - activa.offsetWidth) / 2);
  }
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
  if (ruta === 'tendencias') { leeFiltrosTendencias(bruto); show('tendencias'); abrirTendencias(); return; }
  if (ruta === 'top') { history.replaceState(null, '', '#/contenidos'); }
  if (ruta === 'contenidos' || ruta === 'top') { leeFiltrosContenidos(bruto); show('contenidos'); abrirContenidos(); return; }
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
      <td><div class="medio-cell">${m.logo ? `<img class="rank-logo" src="${esc(m.logo)}" alt="" width="34" height="34" loading="lazy">` : ''}<div><div><strong>${esc(m.nombre)}</strong></div><div class="h">${esc(m.handle)} · ${compact(m.seguidores)} ${t('seguidores')}</div></div></div></td>
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

/* ---------- tendencias ----------
   Una línea por medio a lo largo de los años (o los meses) de la muestra. Los
   datos salen de scripts/build_tendencias_data.py: por medio y periodo, el total
   muestreado y, por subconjunto, [tuits, mediana RT, media RT, mediana me gusta,
   media me gusta]. Los meses van en otro fichero y solo se piden al elegirlos. */
const TD = { medida: 'rt_mediana', sub: 'todos', gran: 'ano', cuentas: 'todos', destacar: 'altos', noticias: 'no', log: false, sel: null, orden: 'media', dir: -1 };
const TD_DESTACAR = ['altos', 'crecen', 'caen'];
const TD_MEDIDAS = ['rt_mediana', 'rt_media', 'lk_mediana', 'n', 'pct'];
const TD_SUBS = ['todos', 'politicos', 'izq', 'der', 'PSOE+', 'PSOE-', 'PP+', 'PP-', 'Vox+', 'Vox-', 'Sumar+', 'Sumar-'];
const TD_POS = { rt_mediana: 1, rt_media: 2, lk_mediana: 3 };
const TD_MIN = { ano: 20, mes: 5 };   // tuits mínimos para dibujar una mediana o una media
const TD_AUTO = 5, TD_MAX = 8;        // ocho colores categóricos, en orden fijo
const TD_PARAMS = { medida: 'medida', sub: 'tuits', gran: 'ver', cuentas: 'cuentas', destacar: 'destacar', noticias: 'noticias' };
// noticias políticas que se pueden superponer: ninguna, los grandes eventos (elecciones
// y corrupción, juntos o por separado), las de relevancia 5 o todas
const TD_NOTICIAS = ['no', 'grandes', 'elecciones', 'corrupcion', 'clave', 'todas'];
const TEND = { ano: null, mes: null, noticias: null };
let tdError = false;

function leeFiltrosTendencias(cadena) {
  if (!cadena.includes('?')) return;
  const usp = new URLSearchParams(cadena.split('?')[1]);
  const m = usp.get('medida'), s = usp.get('tuits'), g = usp.get('ver'), c = usp.get('cuentas'), sel = usp.get('medios');
  if (TD_MEDIDAS.includes(m)) TD.medida = m;
  if (TD_SUBS.includes(s)) TD.sub = s;
  if (g === 'ano' || g === 'mes') TD.gran = g;
  if (c) TD.cuentas = c;
  const d = usp.get('destacar');
  if (TD_DESTACAR.includes(d)) TD.destacar = d;
  const nt = usp.get('noticias');
  if (TD_NOTICIAS.includes(nt)) TD.noticias = nt;
  TD.log = usp.get('log') === '1';
  if (sel) TD.sel = sel.split(',').filter(Boolean).slice(0, TD_MAX);
}
function escribeFiltrosTendencias() {
  const usp = new URLSearchParams();
  const def = { medida: 'rt_mediana', sub: 'todos', gran: 'ano', cuentas: 'todos', destacar: 'altos', noticias: 'no' };
  for (const k in TD_PARAMS) if (TD[k] !== def[k]) usp.set(TD_PARAMS[k], TD[k]);
  if (TD.log) usp.set('log', '1');
  if (TD.sel) usp.set('medios', TD.sel.join(','));
  const q = usp.toString();
  history.replaceState(null, '', '#/tendencias' + (q ? '?' + q : ''));
}
async function abrirTendencias() {
  pintarTendencias();
  const conNoticias = TD.noticias !== 'no';
  const falta = !TEND.ano || (TD.gran === 'mes' && !TEND.mes) || (conNoticias && !TEND.noticias);
  if (!falta) return;
  try {
    if (!TEND.ano) TEND.ano = await pedirJSON('data/tendencias.json' + VER);
    if (TD.gran === 'mes' && !TEND.mes) TEND.mes = await pedirJSON('data/tendencias_meses.json' + VER);
    tdError = false;
  } catch (err) { tdError = true; }
  // las noticias van aparte: si fallan, el gráfico se dibuja igual sin ellas
  if (conNoticias && !TEND.noticias) {
    try { TEND.noticias = (await pedirJSON('data/noticias.json' + VER)).noticias; }
    catch (err) { TEND.noticias = []; }
  }
  pintarTendencias();
}
// las noticias que caen dentro de la ventana de la muestra, según el filtro elegido
function noticiasTend() {
  if (TD.noticias === 'no' || !TEND.noticias) return [];
  const { desde, hasta } = INDEX.ventana;
  const pasa = {
    todas: () => true,
    clave: n => n.relevancia >= 5,
    grandes: n => !!n.grupo,
    elecciones: n => n.grupo === 'elecciones',
    corrupcion: n => n.grupo === 'corrupcion',
  }[TD.noticias];
  return TEND.noticias.filter(n => n.fecha >= desde && n.fecha <= hasta && pasa(n));
}
const fechaLarga = f => new Date(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10))
  .toLocaleDateString(LANG === 'en' ? 'en-GB' : 'es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const impactosHTML = imps => imps.map(([p, sg]) =>
  `<span class="td-imp td-imp-${sg === '+' ? 'mas' : sg === '-' ? 'menos' : 'cero'}">${esc(p)} ${{ '-': '−', '0': '=', '±': '±' }[sg] || '+'}</span>`).join('');
function periodosTend(gran) {
  const anos = [];
  const [a0, a1] = [+INDEX.ventana.desde.slice(0, 4), +INDEX.ventana.hasta.slice(0, 4)];
  for (let a = a0; a <= a1; a++) anos.push(String(a));
  if (gran === 'ano') return anos;
  const desde = INDEX.ventana.desde.slice(0, 7), hasta = INDEX.ventana.hasta.slice(0, 7);
  return anos.flatMap(a => Array.from({ length: 12 }, (_, i) => `${a}-${String(i + 1).padStart(2, '0')}`))
    .filter(m => m >= desde && m <= hasta);
}
// valor de un medio en un periodo; null si no hay tuits o la muestra es corta para una mediana
function valorTend(fila, gran) {
  if (!fila || !fila.n) return null;
  const s = fila[TD.sub];
  const n = s ? s[0] : 0;
  if (TD.medida === 'n') return n;
  if (TD.medida === 'pct') return 100 * n / fila.n;
  if (n < TD_MIN[gran]) return null;
  return s[TD_POS[TD.medida]];
}
const fmtTend = v => v == null ? '—' : TD.medida === 'pct' ? `${fx(v, 1)} %` : fx(v, Number.isInteger(v) ? 0 : 1);
const mediaDe = xs => { const v = xs.filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
function seriesTend(gran) {
  const datos = TEND[gran];
  const periodos = periodosTend(gran);
  const porH = new Map(datos.medios.map(m => [m.h.toLowerCase(), m.p]));
  return INDEX.medios.filter(m => pasaCuentas(m, TD.cuentas)).map(m => {
    const p = porH.get(m.handle.toLowerCase()) || {};
    const valores = periodos.map(k => valorTend(p[k], gran));
    const fila = { m, slug: slugDe(m.handle), p, valores, media: mediaDe(valores) };
    if (gran === 'ano') fila.pendiente = pendienteTend(periodos, valores);
    return fila;
  });
}
/* Tendencia de un medio: la pendiente de la recta de mínimos cuadrados sobre sus
   valores anuales, en unidades de la medida por año. Pide cifra en al menos tres
   años. En número de tuits se dejan fuera 2018 y 2026, que están incompletos y
   harían caer cualquier serie por los extremos. */
function pendienteTend(anos, valores) {
  const incompleto = a => (a === anos[0] && !INDEX.ventana.desde.slice(5).startsWith('01'))
    || (a === anos[anos.length - 1] && !INDEX.ventana.hasta.slice(5).startsWith('12'));
  const pts = anos.map((a, i) => [+a, valores[i]])
    .filter(([a, v]) => v != null && !(TD.medida === 'n' && incompleto(String(a))));
  if (pts.length < 3) return null;
  const mx = pts.reduce((x, [a]) => x + a, 0) / pts.length;
  const my = pts.reduce((x, [, v]) => x + v, 0) / pts.length;
  const sxx = pts.reduce((x, [a]) => x + (a - mx) ** 2, 0);
  return sxx ? pts.reduce((x, [a, v]) => x + (a - mx) * (v - my), 0) / sxx : null;
}
const fmtPendiente = v => {
  if (v == null) return '—';
  const n = Math.abs(v) < 0.05 ? 0 : v;
  const signo = n > 0 ? '+' : n < 0 ? '−' : '';
  return signo + fx(Math.abs(n), 1) + (TD.medida === 'pct' ? ' pt' : '');
};
// elegidos: los que fijó el lector o, si no fijó ninguno, los más altos con la medida actual
function elegidosTend(anuales) {
  if (TD.sel) {
    const validos = new Set(anuales.map(s => s.slug));
    return TD.sel.filter(s => validos.has(s));
  }
  // los automáticos piden cifra en al menos tres años, para que una cuenta recién llegada no acapare el gráfico
  if (TD.destacar !== 'altos') {
    const signo = TD.destacar === 'crecen' ? 1 : -1;
    return anuales.filter(s => s.pendiente != null && signo * s.pendiente > 0)
      .sort((a, b) => signo * (b.pendiente - a.pendiente)).slice(0, TD_AUTO).map(s => s.slug);
  }
  const conSerie = s => s.valores.filter(v => v != null).length >= 3;
  return anuales.filter(s => s.media != null && conSerie(s)).sort((a, b) => b.media - a.media).slice(0, TD_AUTO).map(s => s.slug);
}
// el color sigue al medio mientras está elegido: el hueco de quien sale no repinta al resto
const TD_COLOR = new Map();
function coloresTend(elegidos) {
  for (const k of [...TD_COLOR.keys()]) if (!elegidos.includes(k)) TD_COLOR.delete(k);
  for (const k of elegidos) {
    if (TD_COLOR.has(k)) continue;
    const usados = new Set(TD_COLOR.values());
    TD_COLOR.set(k, Array.from({ length: TD_MAX }, (_, i) => i + 1).find(i => !usados.has(i)) || 1);
  }
  return k => `var(--td-${TD_COLOR.get(k)})`;
}
function alternarTend(slug, anuales) {
  const sel = elegidosTend(anuales);
  const i = sel.indexOf(slug);
  if (i >= 0) sel.splice(i, 1);
  else if (sel.length < TD_MAX) sel.push(slug);
  TD.sel = sel;
  pintarTendencias();
}

function pintarTendencias() {
  const caja = $('#td-filtros');
  if (!caja || !INDEX) return;
  const opSub = k => `<option value="${esc(k)}">${esc(t('tdSubOp', k))}</option>`;
  const cuentas = ['todos', 'generalistas', 'programas'];
  const base = { todos: 'mapaCuentasTodas', generalistas: 'mapaCuentasGen', programas: 'mapaCuentasProg' };
  const cuenta = f => INDEX.medios.filter(m => pasaCuentas(m, f)).length;
  if (!filtrosMapa().includes(TD.cuentas)) TD.cuentas = 'todos';
  caja.innerHTML = `
    <label class="ctl"><span class="ctl-k">${t('tdMedida')}</span><select id="td-medida">
      ${TD_MEDIDAS.map(k => `<option value="${k}">${esc(t('tdMedidaOp', k))}</option>`).join('')}
    </select></label>
    <label class="ctl"><span class="ctl-k">${t('tdTuits')}</span><select id="td-sub">
      ${TD_SUBS.slice(0, 2).map(opSub).join('')}
      <optgroup label="${esc(t('tdGrupoLados'))}">${TD_SUBS.slice(2, 4).map(opSub).join('')}</optgroup>
      <optgroup label="${esc(t('tdGrupoPartidos'))}">${TD_SUBS.slice(4).map(opSub).join('')}</optgroup>
    </select></label>
    <label class="ctl"><span class="ctl-k">${t('tdCuentas')}</span><select id="td-cuentas">
      ${cuentas.map(k => `<option value="${k}">${esc(t(base[k], cuenta(k)))}</option>`).join('')}
      <optgroup label="${esc(t('mapaTipoGrupo'))}">${tiposMapa().map(k => `<option value="${k}">${esc(t('mapaTipoOpcion', t('tipoNombre', k), cuenta(k)))}</option>`).join('')}</optgroup>
    </select></label>
    <label class="ctl"><span class="ctl-k">${t('tdNoticias')}</span><select id="td-noticias">
      ${TD_NOTICIAS.slice(0, 1).map(k => `<option value="${k}">${esc(t('tdNoticiasOp', k))}</option>`).join('')}
      <optgroup label="${esc(t('tdNoticiasGrandes'))}">${TD_NOTICIAS.slice(1, 4).map(k => `<option value="${k}">${esc(t('tdNoticiasOp', k))}</option>`).join('')}</optgroup>
      <optgroup label="${esc(t('tdNoticiasMas'))}">${TD_NOTICIAS.slice(4).map(k => `<option value="${k}">${esc(t('tdNoticiasOp', k))}</option>`).join('')}</optgroup>
    </select></label>
    <div class="ctl"><span class="ctl-k">${t('tdVer')}</span>
      <div class="ctl-v"><div class="seg" id="td-gran" role="group" aria-label="${esc(t('tdVer'))}">
        ${['ano', 'mes'].map(g => `<button type="button" data-gran="${g}" class="${TD.gran === g ? 'is-on' : ''}" aria-pressed="${TD.gran === g}">${t(g === 'ano' ? 'tdAno' : 'tdMes')}</button>`).join('')}
      </div>
      <label class="cj-check td-log"><input type="checkbox" id="td-log"${TD.log ? ' checked' : ''}> ${t('tdLog')}</label></div>
    </div>`;
  $('#td-medida').value = TD.medida;
  $('#td-sub').value = TD.sub;
  $('#td-cuentas').value = TD.cuentas;
  $('#td-noticias').value = TD.noticias;
  $('#td-hint').innerHTML = t('tdHint', t('tdMedidaFrase', TD.medida), t('tdSubFrase', TD.sub));
  $('#td-nota').textContent = t('tdNota', TD_MIN[TD.gran], TD.gran);
  const svg = $('#td-graf');
  const listo = TEND.ano && (TD.gran === 'ano' || TEND.mes);
  if (!listo) {
    svg.innerHTML = `<text x="20" y="40" class="td-aviso">${esc(t(tdError ? 'tdError' : 'tdCargando'))}</text>`;
    svg.setAttribute('viewBox', '0 0 600 80');
    $('#td-medios').innerHTML = '';
    $('#td-tabla thead').innerHTML = '';
    $('#td-tabla tbody').innerHTML = '';
    $('#td-noticias-lista').innerHTML = '';
    return;
  }
  escribeFiltrosTendencias();
  const anuales = seriesTend('ano');
  const series = TD.gran === 'ano' ? anuales : seriesTend('mes');
  const elegidos = elegidosTend(anuales);
  const color = coloresTend(elegidos);
  pintarElegidosTend(anuales, elegidos, color);
  pintarGraficoTend(series, elegidos, color);
  pintarListaNoticias();
  pintarTablaTend(anuales, elegidos, color);
}

function pintarElegidosTend(anuales, elegidos, color) {
  const porSlug = new Map(anuales.map(s => [s.slug, s]));
  const fuera = anuales.filter(s => !elegidos.includes(s.slug)).sort((a, b) => a.m.nombre.localeCompare(b.m.nombre, 'es'));
  const chips = elegidos.map(k => {
    const s = porSlug.get(k);
    return `<button type="button" class="td-chip" data-quita="${esc(k)}" aria-label="${esc(t('tdQuitar', s.m.nombre))}">
      <i style="background:${color(k)}"></i>${esc(s.m.nombre)}<span aria-hidden="true">×</span></button>`;
  }).join('');
  const lleno = elegidos.length >= TD_MAX;
  const destacar = `<div class="td-destacar"><span class="ctl-k">${t('tdDestacar', TD_AUTO)}</span>
    <div class="seg" role="group" aria-label="${esc(t('tdDestacar', TD_AUTO))}">${TD_DESTACAR.map(k => {
      const on = !TD.sel && TD.destacar === k;
      return `<button type="button" data-destacar="${k}" class="${on ? 'is-on' : ''}" aria-pressed="${on}">${t('tdDestacarOp', k, TD_AUTO)}</button>`;
    }).join('')}</div></div>`;
  $('#td-medios').innerHTML = `${destacar}<span class="ctl-k">${t('tdElegidos')}</span>${chips}
    <select id="td-anadir" aria-label="${esc(t('tdAnadir'))}"${lleno ? ' disabled' : ''}>
      <option value="">${esc(lleno ? t('tdLleno', TD_MAX) : t('tdAnadir'))}</option>
      ${fuera.map(s => `<option value="${esc(s.slug)}">${esc(s.m.nombre)}</option>`).join('')}
    </select>
`;
}

function ticksLog(min, max) {
  const out = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
    for (const m of [1, 2, 5]) { const v = m * 10 ** e; if (v >= min * 0.999 && v <= max * 1.001) out.push(v); }
  }
  return out;
}
let TD_GEO = null;
function pintarGraficoTend(series, elegidos, color) {
  const svg = $('#td-graf');
  const periodos = periodosTend(TD.gran);
  const ancho = Math.max(TD.gran === 'mes' ? 620 : 340, Math.round($('.td-wrap').clientWidth - 38));
  const W = ancho, H = Math.round(Math.min(460, Math.max(320, W * 0.5)));
  const noticias = noticiasTend();
  const M = { t: noticias.length ? 50 : 30, r: W < 700 ? 16 : 150, b: 40, l: 58 };
  // solo se dibujan los elegidos, y la escala se ajusta a ellos
  const enSel = new Set(elegidos);
  const todos = series.filter(s => enSel.has(s.slug)).flatMap(s => s.valores).filter(v => v != null);
  if (!todos.length) {
    svg.setAttribute('viewBox', `0 0 ${W} 80`);
    svg.innerHTML = `<text x="20" y="40" class="td-aviso">${esc(t(elegidos.length ? 'tdSinDatosSel' : 'tdSinSel'))}</text>`;
    TD_GEO = null;
    return;
  }
  const log = TD.log && todos.some(v => v > 0);
  const positivos = todos.filter(v => v > 0);
  let py, ticks;
  const alto = H - M.t - M.b;
  if (log) {
    const lo = Math.max(0.5, Math.min(...positivos)), hi = Math.max(...positivos);
    const a = Math.log10(lo), b = Math.log10(hi) + 0.02;
    py = v => v > 0 ? H - M.b - (Math.log10(Math.max(lo, v)) - a) / (b - a || 1) * alto : null;
    ticks = ticksLog(lo, hi);
  } else {
    const esc_ = escalaY(Math.max(...todos));
    py = v => H - M.b - v / esc_.tope * alto;
    ticks = Array.from({ length: esc_.tramos + 1 }, (_, i) => +(esc_.paso * i).toPrecision(12));
  }
  const n = periodos.length;
  const px = i => M.l + (n === 1 ? 0.5 : i / (n - 1)) * (W - M.l - M.r);
  let g = '';
  ticks.forEach(v => {
    const y = py(v).toFixed(1);
    g += `<line x1="${M.l}" x2="${W - M.r}" y1="${y}" y2="${y}"></line>`;
    g += `<text x="${M.l - 9}" y="${(+y + 4).toFixed(1)}" text-anchor="end">${TD.medida === 'pct' ? fx(v, v < 10 && !Number.isInteger(v) ? 1 : 0) + ' %' : compact(v)}</text>`;
  });
  periodos.forEach((k, i) => {
    if (TD.gran === 'mes' && !k.endsWith('-01') && i) return;
    const x = px(i).toFixed(1);
    if (TD.gran === 'mes') g += `<line class="td-ene" x1="${x}" x2="${x}" y1="${M.t}" y2="${H - M.b}"></line>`;
    const etiqueta = k.slice(0, 4);
    const mostrar = W >= (TD.gran === 'ano' ? 520 : 760) || +etiqueta % 2 === 0;
    if (mostrar) g += `<text x="${x}" y="${H - M.b + 22}" text-anchor="${TD.gran === 'mes' ? 'start' : 'middle'}">${etiqueta}</text>`;
  });
  g += `<text class="tit" x="${M.l}" y="14">${esc(t('tdMedidaOp', TD.medida))} · ${esc(t('tdSubOp', TD.sub))}</text>`;
  const camino = vals => {
    let d = '', abierto = false;
    vals.forEach((v, i) => {
      const y = v == null ? null : py(v);
      if (y == null) { abierto = false; return; }
      d += `${abierto ? 'L' : 'M'}${px(i).toFixed(1)} ${y.toFixed(1)}`;
      abierto = true;
    });
    return d;
  };
  // noticias: una raya por fecha bajo las líneas, con su marca encima del gráfico.
  // En los años, el punto de cada año está a mitad de año y la fecha se coloca
  // en proporción entre puntos; en los meses, dentro de su mes.
  const posNoticia = f => {
    let i;
    if (TD.gran === 'mes') {
      i = periodos.indexOf(f.slice(0, 7));
      if (i < 0) return null;
      const dias = new Date(+f.slice(0, 4), +f.slice(5, 7), 0).getDate();
      i += (+f.slice(8, 10) - 1) / dias;
    } else {
      i = periodos.indexOf(f.slice(0, 4));
      if (i < 0) return null;
      const ini = Date.UTC(+f.slice(0, 4), 0, 1), fin = Date.UTC(+f.slice(0, 4) + 1, 0, 1);
      i += (Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) - ini) / (fin - ini) - 0.5;
    }
    return px(Math.max(0, Math.min(n - 1, i)));
  };
  const marcas = noticias.map((nt, j) => {
    const x = posNoticia(nt.fecha);
    if (x == null) return '';
    const xs = x.toFixed(1), ym = M.t - 12;
    return `<g class="td-ev${nt.grupo ? ' is-grande' : ''}" data-ev="${j}">
      <line class="td-ev-raya" x1="${xs}" x2="${xs}" y1="${ym}" y2="${H - M.b}"></line>
      <line class="td-ev-hit" x1="${xs}" x2="${xs}" y1="${ym - 7}" y2="${H - M.b}"></line>
      <path class="td-ev-marca" d="${formaNoticia(nt.grupo, x, ym)}"></path></g>`;
  }).join('');
  if (noticias.length) {
    // la leyenda solo nombra las formas que hay en el gráfico
    const hay = k => noticias.some(nt => (nt.grupo || 'otras') === k);
    const leyenda = ['elecciones', 'corrupcion', 'otras'].filter(hay)
      .map(k => `${{ elecciones: '◆', corrupcion: '■', otras: '◇' }[k]} ${t('tdNoticiasGrupo', k)}`).join('   ');
    g += `<text class="td-ev-tit" x="${W - M.r}" y="14" text-anchor="end" xml:space="preserve">${esc(leyenda)}</text>`;
  }
  const porSlug = new Map(series.map(s => [s.slug, s]));
  const etiquetas = [];
  const color_ = elegidos.map(k => {
    const s = porSlug.get(k);
    if (!s) return '';
    const d = camino(s.valores);
    const c = color(k);
    // en los años, un punto por valor; un punto suelto entre huecos también se ve en los meses
    const puntos = s.valores.map((v, i) => {
      if (v == null || py(v) == null) return '';
      const solo = s.valores[i - 1] == null && s.valores[i + 1] == null;
      return TD.gran === 'ano' || solo ? `<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="4" fill="${c}"></circle>` : '';
    }).join('');
    const ult = s.valores.map((v, i) => [v, i]).filter(([v]) => v != null && py(v) != null).pop();
    if (ult) etiquetas.push({ k, nombre: s.m.nombre, x: px(ult[1]), y: py(ult[0]), c });
    return `<g class="td-linea td-color" data-h="${esc(k)}"><path class="td-hit" d="${d}"></path><path class="td-trazo" d="${d}" stroke="${c}"></path>${puntos}</g>`;
  }).join('');
  // etiquetas a la derecha del último punto, separadas para que no se pisen
  let rotulos = '';
  if (M.r > 100) {
    etiquetas.sort((a, b) => a.y - b.y);
    const SEP = 15;
    etiquetas.forEach((e, i) => { e.ly = Math.max(e.y, i ? etiquetas[i - 1].ly + SEP : M.t); });
    for (let i = etiquetas.length - 1; i >= 0; i--) {
      const tope = i === etiquetas.length - 1 ? H - M.b : etiquetas[i + 1].ly - SEP;
      etiquetas[i].ly = Math.min(etiquetas[i].ly, tope);
    }
    rotulos = etiquetas.map(e => {
      const x0 = W - M.r + 8;
      const nombre = e.nombre.length > 18 ? e.nombre.slice(0, 17) + '…' : e.nombre;
      return `<path class="td-guia" d="M${(e.x + 5).toFixed(1)} ${e.y.toFixed(1)} L${(x0 - 3).toFixed(1)} ${e.ly.toFixed(1)}" stroke="${e.c}"></path>
        <text class="td-rotulo" x="${x0}" y="${(e.ly + 4).toFixed(1)}">${esc(nombre)}</text>`;
    }).join('');
  }
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.minWidth = W + 'px';
  svg.innerHTML = `<g class="grid">${g}</g><g class="td-evs">${marcas}</g><g>${color_}</g><g class="td-rotulos">${rotulos}</g>
    <line class="td-cruz" x1="0" x2="0" y1="${M.t}" y2="${H - M.b}" visibility="hidden"></line>`;
  TD_GEO = { periodos, px, W, M, series: porSlug, elegidos, color, noticias };
}

function tipTend(ev) {
  const tip = $('#td-tip'), svg = $('#td-graf');
  if (!TD_GEO) return;
  const r = svg.getBoundingClientRect();
  const escala = TD_GEO.W / r.width;
  const x = (ev.clientX - r.left) * escala;
  const { periodos, px, M } = TD_GEO;
  if (x < M.l - 10 || x > TD_GEO.W - M.r + 10) { ocultarTipTend(); return; }
  const marca = ev.target.closest && ev.target.closest('.td-ev');
  if (marca) { tipNoticia(ev, TD_GEO.noticias[+marca.dataset.ev], marca); return; }
  let i = 0, mejor = Infinity;
  periodos.forEach((_, j) => { const d = Math.abs(px(j) - x); if (d < mejor) { mejor = d; i = j; } });
  const cruz = svg.querySelector('.td-cruz');
  cruz.setAttribute('x1', px(i)); cruz.setAttribute('x2', px(i)); cruz.setAttribute('visibility', 'visible');
  const k = periodos[i];
  const etiqueta = TD.gran === 'mes' ? new Date(+k.slice(0, 4), +k.slice(5) - 1, 1).toLocaleDateString(LANG === 'en' ? 'en-GB' : 'es-ES', { month: 'long', year: 'numeric' }) : k;
  const linea = ev.target.closest && ev.target.closest('.td-linea');
  const fila = (s, c) => {
    const f = s.p[k], v = s.valores[i];
    const nSub = f && f[TD.sub] ? f[TD.sub][0] : 0;
    const det = !f || !f.n ? '' : v == null && !['n', 'pct'].includes(TD.medida) ? t('tdTipPocos', nf(nSub), TD_MIN[TD.gran]) : t('tdTipN', nf(nSub), nf(f.n));
    return `<div class="td-tf"><i style="background:${c || 'var(--muted)'}"></i><b>${esc(s.m.nombre)}</b><span>${fmtTend(v)}</span></div>${det ? `<div class="tm">${det}</div>` : ''}`;
  };
  let cuerpo;
  $$('#td-graf .td-linea.is-foco').forEach(el => el.classList.remove('is-foco'));
  if (linea) {
    linea.classList.add('is-foco');
    const s = TD_GEO.series.get(linea.dataset.h);
    const elegido = TD_GEO.elegidos.includes(linea.dataset.h);
    const pend = s.pendiente != null ? `<div class="tm">${t('tdTipPend', fmtPendiente(s.pendiente))}</div>` : '';
    cuerpo = fila(s, elegido ? TD_GEO.color(linea.dataset.h) : null) + pend + `<div class="tm">${t(elegido ? 'tdTipQuita' : 'tdTipPulsa')}</div>`;
  } else {
    const filas = TD_GEO.elegidos.map(h => TD_GEO.series.get(h)).filter(Boolean)
      .sort((a, b) => (b.valores[i] ?? -1) - (a.valores[i] ?? -1));
    if (!filas.length) { ocultarTipTend(); return; }
    cuerpo = filas.map(s => fila(s, TD_GEO.color(s.slug))).join('');
  }
  tip.innerHTML = `<div class="tt">${esc(etiqueta)}</div>${cuerpo}`;
  colocarTipTend(ev);
}
function colocarTipTend(ev) {
  const tip = $('#td-tip');
  tip.hidden = false;
  const wrap = $('.td-wrap').getBoundingClientRect();
  const left = ev.clientX - wrap.left + $('.td-wrap').scrollLeft;
  const ancho = tip.offsetWidth;
  const derecha = left + 16 + ancho <= $('.td-wrap').scrollLeft + wrap.width;
  tip.style.left = Math.max(8, derecha ? left + 16 : left - ancho - 16) + 'px';
  tip.style.top = Math.max(8, ev.clientY - wrap.top - 20) + 'px';
}
function tipNoticia(ev, nt, marca) {
  if (!nt) return;
  ocultarTipTend();
  marca.classList.add('is-foco');
  $('#td-tip').innerHTML = `<div class="tt">${esc(fechaLarga(nt.fecha))}</div>
    <div class="td-ev-nombre">${esc(nt.nombre)}</div>
    <div class="tm">${esc(nt.categoria)} · ${esc(nt.ambito)}</div>
    <div class="td-ev-desc">${esc(nt.descripcion)}</div>
    ${nt.impactos.length ? `<div class="td-imps">${impactosHTML(nt.impactos)}</div>` : ''}
    <div class="tm">${t('tdNoticiasPulsa')}</div>`;
  colocarTipTend(ev);
}
function ocultarTipTend() {
  $$('#td-graf .td-ev.is-foco').forEach(el => el.classList.remove('is-foco'));
  const tip = $('#td-tip');
  if (tip) tip.hidden = true;
  const cruz = $('#td-graf .td-cruz');
  if (cruz) cruz.setAttribute('visibility', 'hidden');
  $$('#td-graf .td-linea.is-foco').forEach(el => el.classList.remove('is-foco'));
}

// elecciones con rombo, corrupción con cuadrado y el resto con rombo hueco
function formaNoticia(grupo, x, y) {
  if (grupo === 'corrupcion') return `M${(x - 4.5).toFixed(1)} ${y - 4.5}h9v9h-9Z`;
  const r = grupo ? 6 : 5;
  return `M${x.toFixed(1)} ${y - r}L${(x + r).toFixed(1)} ${y}L${x.toFixed(1)} ${y + r}L${(x - r).toFixed(1)} ${y}Z`;
}
// la lista que acompaña al gráfico cuando hay noticias: para consultar cuándo fue cada una
function pintarListaNoticias() {
  const caja = $('#td-noticias-lista');
  const noticias = noticiasTend();
  if (!noticias.length) { caja.innerHTML = ''; return; }
  const dominio = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
  caja.innerHTML = `<details class="td-noticias"${TD_LISTA_ABIERTA ? ' open' : ''}>
    <summary>${esc(t('tdNoticiasLista', noticias.length))}</summary>
    <p class="hint">${t('tdNoticiasFuente')}</p>
    <ol>${noticias.map((nt, j) => `<li data-ev="${j}"${nt.grupo ? ` class="is-grande td-g-${nt.grupo}"` : ''}>
      <time datetime="${nt.fecha}">${esc(fechaLarga(nt.fecha))}</time>
      <div><b>${esc(nt.nombre)}</b> <span class="td-ev-cat">${esc(nt.categoria)}</span>
        <p>${esc(nt.descripcion)}</p>
        ${nt.impactos.length ? `<div class="td-imps">${impactosHTML(nt.impactos)}</div>` : ''}
        ${nt.fuentes.length ? `<div class="td-fuentes">${nt.fuentes.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(dominio(u))}</a>`).join(' · ')}</div>` : ''}
      </div></li>`).join('')}</ol></details>`;
}
let TD_LISTA_ABIERTA = false;

function pintarTablaTend(anuales, elegidos, color) {
  const anos = periodosTend('ano');
  const col = anos.indexOf(TD.orden);
  const clave = s => TD.orden === 'pendiente' ? s.pendiente : col < 0 ? s.media : s.valores[col];
  const filas = anuales.filter(s => s.media != null).sort((a, b) => {
    const x = clave(a), y = clave(b);
    if (x == null && y == null) return a.m.nombre.localeCompare(b.m.nombre, 'es');
    if (x == null) return 1;
    if (y == null) return -1;
    return TD.dir * (x - y);
  });
  const maximo = Math.max(1e-9, ...anuales.flatMap(s => s.valores).filter(v => v != null));
  const flecha = k => TD.orden === k ? (TD.dir < 0 ? ' ▼' : ' ▲') : '';
  $('#td-tabla thead').innerHTML = `<tr><th class="c-medio">${t('tdColMedio')}</th>
    ${anos.map(a => `<th class="num${TD.orden === a ? ' sel' : ''}" data-td-orden="${a}">${a}${flecha(a)}</th>`).join('')}
    <th class="num${TD.orden === 'media' ? ' sel' : ''}" data-td-orden="media" title="${esc(t('tdColMediaTip'))}">${t('tdColMedia')}${flecha('media')}</th>
    <th class="num${TD.orden === 'pendiente' ? ' sel' : ''}" data-td-orden="pendiente" title="${esc(t('tdColPendTip'))}">${t('tdColPend')}${flecha('pendiente')}</th></tr>`;
  const celda = v => {
    if (v == null) return `<td class="num td-vacia">—</td>`;
    const fuerza = TD.log && v > 0 ? Math.log10(1 + v) / Math.log10(1 + maximo) : v / maximo;
    return `<td class="num" style="--td-calor:${Math.round(3 + 22 * Math.max(0, fuerza))}%">${fmtTend(v)}</td>`;
  };
  const celdaPend = v => {
    const cls = v == null || Math.abs(v) < 0.05 ? '' : v > 0 ? ' td-sube' : ' td-baja';
    return `<td class="num td-pend${cls}">${v == null || Math.abs(v) < 0.05 ? '' : v > 0 ? '▲ ' : '▼ '}${fmtPendiente(v)}</td>`;
  };
  $('#td-tabla tbody').innerHTML = filas.map(s => {
    const on = elegidos.includes(s.slug);
    return `<tr data-td="${esc(s.slug)}" class="${on ? 'is-sel' : ''}">
      <td class="c-medio"><span class="td-nombre"><i style="background:${on ? color(s.slug) : 'transparent'}"></i>${esc(s.m.nombre)}</span></td>
      ${s.valores.map(celda).join('')}${celda(s.media)}${celdaPend(s.pendiente)}</tr>`;
  }).join('') || `<tr><td colspan="${anos.length + 3}" class="empty">${t('tdSinDatos')}</td></tr>`;
}

// ---------- descargar como imagen ----------
// html-to-image solo se pide la primera vez que alguien descarga algo
let HTI = null;
function cargarHTI() {
  if (!HTI) HTI = new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = 'vendor/html-to-image.js?v=1.11.11';
    s.onload = () => window.htmlToImage ? ok(window.htmlToImage) : ko(new Error('html-to-image'));
    s.onerror = () => { HTI = null; ko(new Error('html-to-image')); };
    document.head.appendChild(s);
  });
  return HTI;
}

// cortar un texto en líneas que quepan en un ancho
function lineasTexto(ctx, texto, ancho) {
  const lineas = [];
  let actual = '';
  for (const palabra of String(texto || '').split(/\s+/).filter(Boolean)) {
    const prueba = actual ? actual + ' ' + palabra : palabra;
    if (actual && ctx.measureText(prueba).width > ancho) { lineas.push(actual); actual = palabra; }
    else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

async function descargarImagen(nodo, nombre, titulo, subtitulo, altoFijo) {
  const lib = await cargarHTI();
  const css = getComputedStyle(document.documentElement);
  const v = k => css.getPropertyValue(k).trim();
  const fondo = v('--panel') || '#fff';
  const escala = 2;
  const ancho = nodo.scrollWidth, alto = altoFijo || nodo.scrollHeight;
  const img = await lib.toCanvas(nodo, {
    backgroundColor: fondo, pixelRatio: escala, width: ancho, height: alto,
    style: { margin: '0', boxShadow: 'none', overflow: 'visible', maxHeight: 'none', minHeight: '0', height: alto + 'px', flex: 'none' },
    filter: n => !(n.classList && (n.classList.contains('tip') || n.classList.contains('descarga'))),
  });
  // la imagen lleva título arriba y la procedencia abajo, para que se entienda fuera de la web
  const pad = 28, anchoTexto = ancho;
  const medir = document.createElement('canvas').getContext('2d');
  const fTit = `800 26px ${v('--f-display')}`, fSub = `400 15px ${v('--f-sans')}`, fPie = `500 12px ${v('--f-mono')}`;
  medir.font = fTit; const lTit = lineasTexto(medir, titulo, anchoTexto);
  medir.font = fSub; const lSub = lineasTexto(medir, subtitulo, anchoTexto);
  const altoCab = lTit.length * 32 + (lSub.length ? 8 + lSub.length * 21 : 0) + 18;
  const altoPie = 40;
  const lienzo = document.createElement('canvas');
  lienzo.width = (ancho + pad * 2) * escala;
  lienzo.height = (pad + altoCab + alto + altoPie + pad / 2) * escala;
  const ctx = lienzo.getContext('2d');
  ctx.scale(escala, escala);
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, ancho + pad * 2, lienzo.height / escala);
  ctx.textBaseline = 'top';
  let y = pad;
  ctx.fillStyle = v('--ink'); ctx.font = fTit;
  lTit.forEach(l => { ctx.fillText(l, pad, y); y += 32; });
  if (lSub.length) {
    y += 8; ctx.fillStyle = v('--muted'); ctx.font = fSub;
    lSub.forEach(l => { ctx.fillText(l, pad, y); y += 21; });
  }
  y += 18;
  ctx.drawImage(img, pad, y, ancho, alto);
  y += alto + 16;
  ctx.strokeStyle = v('--line'); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + ancho, y); ctx.stroke();
  ctx.fillStyle = v('--muted'); ctx.font = fPie;
  ctx.fillText(t('descargaPie'), pad, y + 10);
  const blob = await new Promise(ok => lienzo.toBlob(ok, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// qué se fotografía con cada botón, con qué título y con qué nombre de fichero
function objetivoDescarga(clave) {
  const opcion = sel => { const s = $(sel); return s && s.selectedOptions[0] ? s.selectedOptions[0].textContent.trim() : ''; };
  const tdTit = () => `${t('tdMedidaOp', TD.medida)} · ${t('tdSubOp', TD.sub)} · ${t('tdVer')} ${t(TD.gran === 'mes' ? 'tdMes' : 'tdAno').toLowerCase()}`;
  const limpio = x => String(x).toLowerCase().replace('+', 'a-favor').replace(/-$/, '-en-contra').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (clave === 'ranking') return { nodo: $('#tabla-ranking'), nombre: 'medios-ranking.png', titulo: t('rankingTitle'), sub: '' };
  if (clave === 'mapa') {
    // en la historia el recuadro del mapa se estira para llenar la pantalla: se recorta a lo que ocupa el dibujo
    const nodo = $('.panel-mapa .chart-wrap'), svg = $('#mapa');
    const alto = Math.ceil(svg.getBoundingClientRect().bottom - nodo.getBoundingClientRect().top + parseFloat(getComputedStyle(nodo).paddingBottom) + 2);
    return { nodo, alto, nombre: `medios-mapa-${limpio(mapaPeriodo)}.png`, titulo: `${t('tabMapa')} · ${opcion('#mapa-periodo')}`, sub: ($('#mapa-resumen') || {}).textContent || '' };
  }
  if (clave === 'tendencias') return { nodo: $('.td-wrap'), nombre: `medios-tendencias-${limpio(TD.medida)}-${limpio(TD.sub)}-${TD.gran}.png`, titulo: t('tdTitulo'), sub: tdTit() };
  if (clave === 'td-tabla') return { nodo: $('#td-tabla'), nombre: `medios-tendencias-tabla-${limpio(TD.medida)}-${limpio(TD.sub)}.png`, titulo: `${t('tdTitulo')} · ${t('tdTablaTitulo')}`, sub: tdTit() };
  return null;
}

function iniciarDescargas() {
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-descarga]');
    if (!b || b.getAttribute('aria-busy') === 'true') return;
    b.setAttribute('aria-busy', 'true');
    try {
      const o = objetivoDescarga(b.dataset.descarga);
      if (o && o.nodo) await descargarImagen(o.nodo, o.nombre, o.titulo, o.sub.trim(), o.alto);
    }
    catch (err) { console.error(err); alert(t('descargaError')); }
    finally { b.removeAttribute('aria-busy'); }
  });
}

function iniciarTendencias() {
  const caja = $('#td-filtros');
  caja.addEventListener('change', e => {
    const id = e.target.id;
    if (id === 'td-medida') TD.medida = e.target.value;
    else if (id === 'td-sub') TD.sub = e.target.value;
    else if (id === 'td-cuentas') TD.cuentas = e.target.value;
    else if (id === 'td-log') TD.log = e.target.checked;
    else if (id === 'td-noticias') { TD.noticias = e.target.value; abrirTendencias(); return; }
    else return;
    pintarTendencias();
  });
  caja.addEventListener('click', e => {
    const b = e.target.closest('[data-gran]');
    if (!b || b.dataset.gran === TD.gran) return;
    TD.gran = b.dataset.gran;
    abrirTendencias();
  });
  const anuales = () => seriesTend('ano');
  $('#td-medios').addEventListener('click', e => {
    const q = e.target.closest('[data-quita]');
    if (q) { alternarTend(q.dataset.quita, anuales()); return; }
    const d = e.target.closest('[data-destacar]');
    if (d) {
      TD.destacar = d.dataset.destacar;
      TD.sel = null;
      // la tabla acompaña: por tendencia al buscar quién crece o cae, por promedio si no
      if (TD.destacar === 'altos') { TD.orden = 'media'; TD.dir = -1; }
      else { TD.orden = 'pendiente'; TD.dir = TD.destacar === 'crecen' ? -1 : 1; }
      pintarTendencias();
    }
  });
  $('#td-medios').addEventListener('change', e => {
    if (e.target.id === 'td-anadir' && e.target.value) alternarTend(e.target.value, anuales());
  });
  const svg = $('#td-graf');
  svg.addEventListener('mousemove', tipTend);
  svg.addEventListener('mouseleave', ocultarTipTend);
  // al pasar por una noticia de la lista, su marca se ilumina en el gráfico
  const lista = $('#td-noticias-lista');
  lista.addEventListener('toggle', e => { TD_LISTA_ABIERTA = e.target.open; }, true);
  lista.addEventListener('mouseover', e => {
    const li = e.target.closest('li[data-ev]');
    $$('#td-graf .td-ev.is-foco').forEach(el => el.classList.remove('is-foco'));
    if (li) { const m = $(`#td-graf .td-ev[data-ev="${li.dataset.ev}"]`); if (m) m.classList.add('is-foco'); }
  });
  lista.addEventListener('mouseleave', () => $$('#td-graf .td-ev.is-foco').forEach(el => el.classList.remove('is-foco')));
  svg.addEventListener('click', e => {
    const m = e.target.closest('.td-ev');
    if (m) {
      // pulsar una marca abre la lista y lleva a esa noticia
      const det = $('#td-noticias-lista details'), li = $(`#td-noticias-lista li[data-ev="${m.dataset.ev}"]`);
      if (det && li) {
        det.open = true;
        $$('#td-noticias-lista li.is-foco').forEach(el => el.classList.remove('is-foco'));
        li.classList.add('is-foco');
        li.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    const l = e.target.closest('.td-linea');
    if (l) { ocultarTipTend(); alternarTend(l.dataset.h, anuales()); }
  });
  $('#td-tabla thead').addEventListener('click', e => {
    const th = e.target.closest('[data-td-orden]');
    if (!th) return;
    const k = th.dataset.tdOrden;
    if (k === TD.orden) TD.dir *= -1; else { TD.orden = k; TD.dir = -1; }
    pintarTendencias();
  });
  $('#td-tabla tbody').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-td]');
    if (tr) alternarTend(tr.dataset.td, anuales());
  });
  let espera = 0;
  window.addEventListener('resize', () => {
    if (currentView !== 'tendencias') return;
    clearTimeout(espera);
    espera = setTimeout(pintarTendencias, 150);
  });
}

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
      MEDIO = await cargarTuitsDe(meta);
    } catch (err) {
      $('#medio-panel').innerHTML = `<p class="empty">${t('medioError')}</p>`;
      return;
    }
  }
  mSort = 'peso'; mParty = ''; mDir = ''; mText = ''; mShown = PAGE;
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
      <div><span class="idx-pill ${cls}">${txt}</span></div>
    </div>
    <div class="kpis" id="mkpis"></div>
    <p class="foot-note" id="mkpinota" hidden></p>
    <div class="medio-dg" id="mdg"></div>
    <div class="filters">
      <input type="search" id="mt" placeholder="${t('medioSearchPlaceholder')}" autocomplete="off">
      <select id="mp"></select>
      <select id="md"></select>
      <select id="ms">
        <option value="peso">${t('cajonOrdenOp', 'peso')}</option>
        <option value="rt">${t('medioSortRt')}</option>
        <option value="lk">${t('medioSortLk')}</option>
        <option value="vw">${t('medioSortVw')}</option>
        <option value="f">${t('medioSortF')}</option>
      </select>
      <select id="mo"><option value="">${t('medioAllTweets')}</option><option value="pol">${t('medioOnlyPol')}</option></select>
    </div>
    <div id="mlist" class="cards-list"></div>
    <button class="more" id="mmore" hidden>${t('loadMoreN', 0)}</button>`;
  $('#back').onclick = () => { location.hash = vistaPrevia === 'ranking' ? '#/ranking' : '#/mapa' + hashPeriodo(); };
  $('#mt').value = mText;
  $('#ms').value = mSort;
  $('#mt').addEventListener('input', e => { mText = e.target.value; mShown = PAGE; pintarListaMedio(); });
  $('#mp').addEventListener('change', e => { mParty = e.target.value; mShown = PAGE; pintarListaMedio(); });
  $('#md').addEventListener('change', e => { mDir = e.target.value; mShown = PAGE; pintarListaMedio(); });
  $('#ms').addEventListener('change', e => { mSort = e.target.value; pintarListaMedio(); });
  $('#mo').addEventListener('change', e => { mShown = PAGE; pintarListaMedio(); });
  $('#mmore').addEventListener('click', () => { mShown += PAGE; pintarListaMedio(); });
  $('#mdg').addEventListener('click', e => {
    const modo = e.target.closest('[data-dgmodo]');
    if (modo) { fijarModoDesglose(modo.dataset.dgmodo); pintarListaMedio(); return; }
    const b = e.target.closest('[data-dgp]');
    if (!b) return;
    const on = mParty === b.dataset.dgp && mDir === b.dataset.dgd;
    mParty = on ? '' : b.dataset.dgp;
    mDir = on ? '' : b.dataset.dgd;
    mShown = PAGE;
    pintarListaMedio();
  });
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
  if (mSort === 'peso') return ordenPorPeso(ts, casillasMedio());
  ts = ts.slice().sort((a, b) => mSort === 'f' ? (a.f < b.f ? 1 : -1) : (b[mSort] - a[mSort]));
  return ts;
}
// el desglose de la ficha sigue a la búsqueda, no al partido ni al sentido
function casillasMedio() {
  const q = mText.trim().toLowerCase();
  return casillasDeTuits(q ? MEDIO.tweets.filter(tw => tw.t.toLowerCase().includes(q)) : MEDIO.tweets);
}
function pintarListaMedio() {
  const ts = filtrarTuits();
  pintarMedioCifras(ts);
  const total = ts.length;
  const pinta = tw => tarjeta(tw, MEDIO.handle, MEDIO.nombre);
  $('#mlist').innerHTML = total
    ? (mSort === 'peso' ? listaPorGrupos(ts.slice(0, mShown), casillasMedio(), pinta) : ts.slice(0, mShown).map(pinta).join(''))
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

  const dg = htmlDesglose(casillasMedio(), { clic: true, activo: mParty && mDir ? { p: mParty, d: mDir } : null });
  $('#mdg').innerHTML = dg ? dg + `<p class="dg-pulsa">${t('dgPulsa')}</p>` : '';

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
      <span><b>${nf(tw.rt)}</b> ${t('tweetRetuits')}</span>
      <span><b>${nf(tw.lk)}</b> ${t('tweetMeGusta')}</span>
      <span><b>${nf(tw.rp)}</b> ${t('tweetRespuestas')}</span>
      <span><b>${compact(tw.vw)}</b> ${t('tweetVistas')}</span>
      <span><a href="${esc(tw.u)}" target="_blank" rel="noopener">${t('tweetVerX')}</a></span>
    </div>
  </article>`;
}

/* ---------- contenidos ----------
   Buscador de tuits de todos los medios. Sin medio elegido trabaja sobre
   contenidos.json, todos los tuits con 100 RT o más. Al elegir un medio se
   puede ampliar a su muestra completa con los mismos ficheros por año que el
   panel de la cuenta. Los filtros viven en la URL para poder compartirlos. */
let CONT = null, contError = false;
const CT = { q: '', medio: '', tipo: '', partido: '', dir: '', ano: '', orden: 'rt', soloPol: true, todo: false, n: PAGE };
const CT_PARAMS = { q: 'q', medio: 'medio', tipo: 'tipo', partido: 'partido', dir: 'sentido', ano: 'ano', orden: 'orden' };
const normaliza = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slugDe = h => String(h || '').replace('@', '').toLowerCase();
const textoBusqueda = tw => tw._q || (tw._q = normaliza(tw.t + ' ' + tw.h + ' ' + ((metaDe(tw.h) || {}).nombre || '')));
// resumen común con el panel de la cuenta: cuántos van a cada lado y la barra
function htmlResumen(ts) {
  const IZQ = { PSOE: 1, Sumar: 1 }, DER = { PP: 1, Vox: 1 };
  let izq = 0, der = 0;
  for (const tw of ts) {
    if ((tw.d === 'beneficia' && IZQ[tw.p]) || (tw.d === 'perjudica' && DER[tw.p])) izq++;
    else if ((tw.d === 'beneficia' && DER[tw.p]) || (tw.d === 'perjudica' && IZQ[tw.p])) der++;
  }
  const neu = ts.length - izq - der;
  const w = v => ts.length ? (100 * v / ts.length).toFixed(1) : 0;
  return `<p>${t('cajonResumen', nf(ts.length), nf(izq), nf(der), nf(neu))}</p>
    <div class="mini"><i style="width:${w(izq)}%;background:var(--izq)"></i><i style="width:${w(neu)}%;background:var(--track)"></i><i style="width:${w(der)}%;background:var(--der)"></i></div>`;
}
function leeFiltrosContenidos(cadena) {
  const partes = cadena.split('?');
  if (partes.length < 2 || !partes[1]) return;
  const usp = new URLSearchParams(partes[1]);
  for (const [k, param] of Object.entries(CT_PARAMS)) CT[k] = usp.get(param) || '';
  if (!['rt', 'lk', 'vw', 'f', 'fa'].includes(CT.orden)) CT.orden = 'rt';
  const meta = CT.medio && metaDe(CT.medio);
  CT.medio = meta ? slugDe(meta.handle) : '';
  CT.soloPol = usp.get('pol') !== '0';
  CT.todo = !!CT.medio && usp.get('todo') === '1';
  CT.n = PAGE;
}
function escribeFiltrosContenidos() {
  const usp = new URLSearchParams();
  for (const [k, param] of Object.entries(CT_PARAMS)) {
    if (CT[k] && !(k === 'orden' && CT[k] === 'rt')) usp.set(param, CT[k]);
  }
  if (!CT.soloPol) usp.set('pol', '0');
  if (CT.todo) usp.set('todo', '1');
  const qs = usp.toString();
  history.replaceState(null, '', '#/contenidos' + (qs ? '?' + qs : ''));
}
async function abrirContenidos() {
  pintarContenidos();
  if (!CONT && !contError) {
    try {
      const datos = await pedirJSON('data/contenidos.json' + VER);
      CONT = datos.tweets.map(tw => ({ ...tw, u: `https://x.com/${tw.h.replace('@', '')}/status/${tw.id}` }));
    } catch (err) { contError = true; }
    pintarContenidosLista();
  }
}
// el conjunto sobre el que se filtra: lo viral de todos o la muestra completa de un medio
async function poolContenidos() {
  if (CT.medio && CT.todo) {
    const meta = metaDe(CT.medio);
    const datos = await cargarTuitsDe(meta);
    if (!datos._conH) datos._conH = datos.tweets.map(tw => ({ ...tw, h: meta.handle }));
    return datos._conH;
  }
  if (!CONT) return null;
  return CONT;
}
function opcionesMedios() {
  const tipos = Object.keys(INDEX.tipos || {});
  const medios = INDEX.medios.filter(m => !CT.tipo || m.tipo === CT.tipo)
    .slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const op = m => `<option value="${esc(slugDe(m.handle))}">${esc(m.nombre)}</option>`;
  const grupos = tipos.map(k => {
    const ms = medios.filter(m => m.tipo === k);
    return ms.length ? `<optgroup label="${esc(t('tipoNombre', k))}">${ms.map(op).join('')}</optgroup>` : '';
  }).join('');
  return `<option value="">${t('contTodosMedios')}</option>${grupos}`;
}
function pintarContenidos() {
  const caja = $('#cont-filtros');
  if (!caja || !INDEX) return;
  caja.innerHTML = `
    <input type="search" id="ct-q" placeholder="${esc(t('contBuscar'))}" aria-label="${esc(t('contBuscar'))}" autocomplete="off" value="${esc(CT.q)}">
    <div class="cont-sels">
      <label class="ctl"><span class="ctl-k">${t('contMedio')}</span><select id="ct-medio">${opcionesMedios()}</select></label>
      <label class="ctl"><span class="ctl-k">${t('contTipo')}</span><select id="ct-tipo">
        <option value="">${t('contTodosTipos')}</option>
        ${Object.keys(INDEX.tipos || {}).map(k => `<option value="${k}">${esc(t('tipoNombre', k))}</option>`).join('')}
      </select></label>
      <label class="ctl"><span class="ctl-k">${t('cajonAno')}</span><select id="ct-ano"></select></label>
      <label class="ctl"><span class="ctl-k">${t('cajonOrden')}</span><select id="ct-orden">
        ${['rt', 'lk', 'vw', 'f', 'fa'].map(k => `<option value="${k}">${t('cajonOrdenOp', k)}</option>`).join('')}
      </select></label>
    </div>
    <div class="cj-fila"><span class="ctl-k">${t('cajonPartido')}</span><div class="cj-chips" id="ct-partidos"></div></div>
    <div class="cj-fila"><span class="ctl-k">${t('cajonSentido')}</span><div class="cj-chips" id="ct-dirs"></div></div>
    <div class="cont-checks">
      <label class="cj-check"><input type="checkbox" id="ct-pol"${CT.soloPol ? ' checked' : ''}> ${t('cajonSoloPol')}</label>
      <label class="cj-check" id="ct-todo-l"><input type="checkbox" id="ct-todo"${CT.todo ? ' checked' : ''}> <span id="ct-todo-t"></span></label>
    </div>`;
  $('#ct-medio').value = CT.medio;
  $('#ct-tipo').value = CT.tipo;
  $('#ct-orden').value = CT.orden;
  pintarContenidosLista();
}
let contTurno = 0;
async function pintarContenidosLista() {
  const lista = $('#cont-lista');
  if (!lista || !INDEX || !$('#ct-partidos')) return;
  const meta = CT.medio ? metaDe(CT.medio) : null;
  $('#ct-todo-l').hidden = !meta;
  if (meta) $('#ct-todo-t').textContent = t('contTodo', nf(meta.muestreados));
  const corte = nf(100);
  $('#cont-hint').innerHTML = meta && CT.todo ? t('contHintTodo', esc(meta.nombre), nf(meta.muestreados))
    : meta ? t('contHintMedio', esc(meta.nombre), nf(meta.virales), corte)
    : t('contHint', nf(INDEX.totales.virales), corte, nf(INDEX.totales.muestreados));
  escribeFiltrosContenidos();
  const turno = ++contTurno;
  let pool = null;
  const necesitaCarga = (CT.medio && CT.todo) ? !TUITS.has(meta.handle) : !CONT;
  if (necesitaCarga && !contError) {
    lista.innerHTML = `<p class="empty">${t('contCargando')}</p>`;
    $('#cont-res').innerHTML = '';
  }
  try { pool = await poolContenidos(); } catch (err) { pool = null; }
  if (turno !== contTurno) return;
  if (!pool) {
    lista.innerHTML = `<p class="empty">${t(contError || (CT.medio && CT.todo) ? 'cajonError' : 'contCargando')}</p>`;
    $('#cont-res').innerHTML = '';
    $('#ct-partidos').innerHTML = $('#ct-dirs').innerHTML = $('#ct-ano').innerHTML = '';
    $('#cont-mas').hidden = true;
    return;
  }
  const terminos = normaliza(CT.q).split(/\s+/).filter(Boolean);
  const anoDe = tw => (tw.f || '').slice(0, 4);
  const handle = meta ? meta.handle.toLowerCase() : '';
  const base = pool.filter(tw => (!CT.soloPol || tw.p)
    && (!handle || tw.h.toLowerCase() === handle)
    && (!CT.tipo || (metaDe(tw.h) || {}).tipo === CT.tipo)
    && (!terminos.length || terminos.every(x => textoBusqueda(tw).includes(x))));
  const cPart = {}, cDir = {}, cAno = {};
  for (const tw of base) {
    const okA = !CT.ano || anoDe(tw) === CT.ano, okP = !CT.partido || tw.p === CT.partido, okD = !CT.dir || tw.d === CT.dir;
    if (okA && okD && tw.p) cPart[tw.p] = (cPart[tw.p] || 0) + 1;
    if (okA && okP && tw.d) cDir[tw.d] = (cDir[tw.d] || 0) + 1;
    if (okP && okD) cAno[anoDe(tw)] = (cAno[anoDe(tw)] || 0) + 1;
  }
  let ts = base.filter(tw => (!CT.ano || anoDe(tw) === CT.ano) && (!CT.partido || tw.p === CT.partido) && (!CT.dir || tw.d === CT.dir));
  const o = CT.orden;
  ts = ts.slice().sort((a, b) => o === 'f' ? (a.f < b.f ? 1 : a.f > b.f ? -1 : 0)
    : o === 'fa' ? (a.f > b.f ? 1 : a.f < b.f ? -1 : 0) : (b[o] || 0) - (a[o] || 0));

  const chip = (attr, val, txt, cuenta, cls) => {
    const on = (attr === 'p' ? CT.partido : CT.dir) === val;
    return `<button type="button" class="cj-chip ${cls || ''}${on ? ' is-on' : ''}" data-ct${attr}="${val}" aria-pressed="${on}">${txt}${cuenta != null ? ` <span>${nf(cuenta)}</span>` : ''}</button>`;
  };
  $('#ct-partidos').innerHTML = chip('p', '', t('cajonTodos'), null) +
    PARTIDOS.filter(p => cPart[p] || p === CT.partido).map(p => chip('p', p, p, cPart[p] || 0, CHIP[p])).join('');
  $('#ct-dirs').innerHTML = chip('d', '', t('cajonTodos'), null) +
    ['beneficia', 'perjudica', 'neutro'].filter(d => cDir[d] || d === CT.dir)
      .map(d => chip('d', d, t('cajonDir', d, ['PSOE', 'PP', 'Vox', 'Sumar'].includes(CT.partido) ? CT.partido : ''), cDir[d] || 0, DIRCHIP[d])).join('');
  const anos = [...new Set([...Object.keys(cAno), CT.ano].filter(Boolean))].sort();
  $('#ct-ano').innerHTML = `<option value="">${t('cajonTodosAnos')}</option>` +
    anos.map(a => `<option value="${a}">${a} (${nf(cAno[a] || 0)})</option>`).join('');
  $('#ct-ano').value = CT.ano;

  $('#cont-res').innerHTML = htmlResumen(ts);
  lista.innerHTML = ts.length
    ? ts.slice(0, CT.n).map(tw => { const m = metaDe(tw.h); return tarjeta(tw, tw.h, m ? m.nombre : tw.h); }).join('')
    : `<p class="empty">${t('cajonVacio')}</p>`;
  const mas = $('#cont-mas');
  mas.hidden = ts.length <= CT.n;
  mas.textContent = t('loadMoreN', nf(ts.length - CT.n));
}
function iniciarContenidos() {
  const caja = $('#cont-filtros');
  let espera = 0;
  caja.addEventListener('click', e => {
    const p = e.target.closest('[data-ctp]');
    if (p) { CT.partido = p.dataset.ctp; CT.n = PAGE; pintarContenidosLista(); return; }
    const d = e.target.closest('[data-ctd]');
    if (d) { CT.dir = d.dataset.ctd; CT.n = PAGE; pintarContenidosLista(); }
  });
  caja.addEventListener('input', e => {
    if (e.target.id !== 'ct-q') return;
    CT.q = e.target.value; CT.n = PAGE;
    clearTimeout(espera);
    espera = setTimeout(pintarContenidosLista, 150);
  });
  caja.addEventListener('change', e => {
    const id = e.target.id;
    if (id === 'ct-medio') {
      CT.medio = e.target.value;
      if (!CT.medio) CT.todo = false;
    } else if (id === 'ct-tipo') {
      CT.tipo = e.target.value;
      const meta = CT.medio && metaDe(CT.medio);
      if (meta && CT.tipo && meta.tipo !== CT.tipo) { CT.medio = ''; CT.todo = false; }
      $('#ct-medio').innerHTML = opcionesMedios();
      $('#ct-medio').value = CT.medio;
    } else if (id === 'ct-ano') CT.ano = e.target.value;
    else if (id === 'ct-orden') CT.orden = e.target.value;
    else if (id === 'ct-pol') CT.soloPol = e.target.checked;
    else if (id === 'ct-todo') CT.todo = e.target.checked;
    else return;
    CT.n = PAGE;
    pintarContenidosLista();
  });
  $('#cont-mas').addEventListener('click', () => { CT.n += PAGE; pintarContenidosLista(); });
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
let mapaFiltro = 'todos';
let mapaB200 = false;      // solo medios con brecha fiable (AGENTS.md, regla 4)
let mapaDestacar = '';     // la historia guiada destaca los programas y atenúa el resto
let mapaPartido = '';
let PARTIDOS_MAPA = null;
let mapaEjeY = 'con_lado';
let mapaTrayectoria = '';
let mapaTam = 'rt_mediana';
const VARS_MAPA = ['con_lado', 'ben', 'perj', 'politicos', 'tuits', 'rt_media', 'rt_mediana'];
const VARS_PARTIDO = ['ben', 'perj'];
const VARS_RT = ['rt_media', 'rt_mediana'];
const MUESTRA_MIN = 5;
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

function mediosPolDe(clave) {
  if (!POL) return [];
  const bloque = POL.periodos && POL.periodos[clave];
  if (bloque && Array.isArray(bloque.medios)) return bloque.medios;
  return POL.medios || [];
}
/* Con un partido elegido, cada medio se recoloca respecto a ese partido: la
   posición es el porcentaje de sus tuits sobre el partido que lo favorecen y la
   altura, los tuits que lo benefician o perjudican. Se conserva la forma de las
   filas de polarizacion.json (izq = perjudica, der = beneficia) para que el
   mapa, las flechas y la ayuda funcionen igual. */
let cachePartido = new WeakMap();
function serieDePartido([ben, perj, rt, media], pol) {
  const n = ben + perj;
  pol = pol || {};
  return {
    izq: perj, der: ben, con_lado: n, posicion: n ? 100 * ben / n : null, rt_mediana: rt, rt_media: media,
    politicos: pol.politicos != null ? pol.politicos : pol.juicios, tuits: pol.tuits,
  };
}
function mediosPeriodoDe(clave) {
  const base = mediosPolDe(clave);
  if (!PARTIDOS_MAPA) return base;
  // la caché cuelga del bloque de polarizacion.json del que sale, así nunca sirve filas viejas
  if (!cachePartido.has(base)) cachePartido.set(base, new Map());
  const porBase = cachePartido.get(base);
  const k = clave + '|' + mapaPartido;
  if (porBase.has(k)) return porBase.get(k);
  const bloque = (PARTIDOS_MAPA.periodos || {})[clave] || PARTIDOS_MAPA.periodos.todo;
  const porHandle = new Map(bloque.medios.map(r => [r.h.toLowerCase(), r]));
  const filas = base.map(r => {
    const q = porHandle.get(r.handle.toLowerCase());
    const politicos = (r.publicado || {}).politicos || 0;
    // sin partido elegido solo se añade la media de retuits, que polarizacion.json no trae
    if (!mapaPartido) {
      const lados = q && q.lados;
      return { ...r, politicos,
        publicado: r.publicado && { ...r.publicado, rt_media: lados ? lados[0][3] : null },
        viral: r.viral && { ...r.viral, rt_media: lados ? lados[1][3] : null } };
    }
    const d = q && q[mapaPartido];
    if (!d) return { handle: r.handle, publicado: null, viral: null, politicos };
    return { handle: r.handle, publicado: serieDePartido(d[0], r.publicado), viral: serieDePartido(d[1], r.viral), politicos };
  });
  porBase.set(k, filas);
  return filas;
}
function mediosPeriodo() { return mediosPeriodoDe(mapaPeriodo); }
const politicosDe = r => r.politicos != null ? r.politicos : ((r.publicado || {}).politicos || 0);

// texto del mapa: con partido elegido usa la variante «P» de la clave, que recibe el partido
const tm = (clave, ...args) => mapaPartido ? t(clave + 'P', mapaPartido, ...args) : t(clave, ...args);

function pasaFiltro(d) {
  if (!d || d.posicion == null || d.con_lado < MUESTRA_MIN) return false;
  return !mapaB200 || d.con_lado >= BRECHA_MIN;
}
/* El selector «Cuentas» separa los medios generalistas de los programas
   concretos de televisión y radio, y deja elegir además un tipo de cuenta
   (data/tipos_medio.json). Cada opción lleva cuántas cuentas suyas superan el
   corte de inclusión. La brecha fiable va aparte, en «Más ajustes». */
const tiposMapa = () => Object.keys((INDEX && INDEX.tipos) || {});
const filtrosMapa = () => ['todos', 'generalistas', 'programas', ...tiposMapa()];
const tipoFiltro = () => tiposMapa().includes(mapaFiltro) ? mapaFiltro : '';
const esPrograma = m => String((m && m.tipo) || '').startsWith('programa');
function pasaCuentas(m, filtro = mapaFiltro) {
  if (filtro === 'generalistas') return !esPrograma(m);
  if (filtro === 'programas') return esPrograma(m);
  if (tiposMapa().includes(filtro)) return m.tipo === filtro;
  return true;
}
const admitidosMapa = () => INDEX.medios.filter(m => (m.izq || 0) + (m.der || 0) > SIGNIFICADOS_MIN);
function etiquetasTipo() {
  const sel = $('#mapa-filtro');
  if (!sel) return;
  const admit = admitidosMapa();
  const cuenta = f => admit.filter(m => pasaCuentas(m, f)).length;
  const base = { todos: 'mapaCuentasTodas', generalistas: 'mapaCuentasGen', programas: 'mapaCuentasProg' };
  for (const op of sel.querySelectorAll(':scope > option')) op.textContent = t(base[op.value], cuenta(op.value));
  // el grupo se crea una vez y después solo se reetiqueta, para no cerrar el desplegable al redibujar
  let grupo = sel.querySelector('optgroup[data-tipos]');
  if (!grupo) {
    grupo = document.createElement('optgroup');
    grupo.dataset.tipos = '';
    grupo.innerHTML = tiposMapa().map(k => `<option value="${k}"></option>`).join('');
    sel.appendChild(grupo);
    sel.value = mapaFiltro;
  }
  grupo.label = t('mapaTipoGrupo');
  for (const op of grupo.querySelectorAll('option')) {
    op.textContent = t('mapaTipoOpcion', t('tipoNombre', op.value), cuenta(op.value));
  }
}
function polDe(handle) {
  return mediosPeriodo().find(r => r.handle.toLowerCase() === (handle || '').toLowerCase());
}
const periodoTxt = () => ({
  todo: t('periodoTodo'), xv: t('periodoXV'),
  2018: '2018', 2019: '2019', 2020: '2020', 2021: '2021', 2022: '2022',
  2023: '2023', 2024: '2024', 2025: '2025', 2026: '2026'
});

/* Variables que se pueden llevar al eje vertical o al tamaño. En modo partido
   der son los tuits que lo benefician e izq los que lo perjudican. */
function valorDe(d, v) {
  if (!d) return 0;
  const x = { con_lado: d.con_lado, ben: d.der, perj: d.izq, politicos: d.politicos != null ? d.politicos : d.juicios,
              tuits: d.tuits, rt_media: d.rt_media, rt_mediana: d.rt_mediana }[v];
  return Number(x) || 0;
}
// máximo de una variable en la ventana; en los años se mira 2018 a 2026 para que la escala no salte al animar
function maxVar(v, anual = false) {
  const claves = anual || MAPA_ANOS.includes(mapaPeriodo) ? MAPA_ANOS : [mapaPeriodo];
  const series = mapaSerie === 'ambas' ? ['publicado', 'viral'] : [mapaSerie];
  let maximo = 1;
  for (const clave of claves) {
    for (const medio of mediosPeriodoDe(clave)) {
      for (const serie of series) maximo = Math.max(maximo, valorDe(medio[serie], v));
    }
  }
  return maximo;
}
function redondoArriba(maximo) {
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  const base = maximo / potencia;
  const escalones = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  return (escalones.find(v => v >= base) || 10) * potencia;
}
// todas las variables usan la misma escala: raíz cuadrada relativa al máximo de la ventana,
// entre un radio mínimo que deja leer el logo y el de siempre para el mayor
let maxTamMapa = 1;
const R_MIN = 15, R_MAX = 24;
const radioTam = v => R_MIN + (R_MAX - R_MIN) * Math.sqrt(Math.min(1, Math.max(0, Number(v) || 0) / maxTamMapa));
const radioDe = d => radioTam(valorDe(d, mapaTam));
const volumen = d => d.politicos != null ? `${nf(d.politicos)} ${t('tipPoliticos')}` : `${nf(d.juicios)} ${t('tweetsConLectura')}`;
const nombreSerie = s => s === 'publicado' ? t('publicado') : t('viral');

// techo y paso del eje Y: el techo es el primer tic que alcanza al punto más alto, con un paso
// redondo (1, 2, 2,5 o 5 por una potencia de diez, o 1,5 en la potencia mayor) y entre cuatro y siete tramos, para no dejar hueco arriba
function escalaY(maximo) {
  maximo = Math.max(1, maximo);
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  let mejor = null;
  for (const k of [potencia / 10, potencia]) {
    for (const m of [1, 1.5, 2, 2.5, 5]) {
      const paso = k * m;
      if ((maximo >= 4 && paso < 1) || (m === 1.5 && k < potencia)) continue;
      const tramos = Math.ceil(maximo / paso - 1e-9);
      if (tramos < 4 || tramos > 7) continue;
      const tope = tramos * paso;
      if (!mejor || tope < mejor.tope - 1e-9 || (Math.abs(tope - mejor.tope) < 1e-9 && tramos < mejor.tramos)) mejor = { tope, paso, tramos };
    }
  }
  if (!mejor) { const tope = redondoArriba(maximo); mejor = { tope, paso: tope / 5, tramos: 5 }; }
  return mejor;
}
function maxYMapa(tray, nodos) {
  // con un recorrido abierto fuera de un año solo se dibuja ese medio, así que el eje se ajusta a él
  if (tray && tray.puntos.length && !MAPA_ANOS.includes(mapaPeriodo)) return escalaY(Math.max(1, ...tray.puntos.map(q => q.y)));
  // fuera de los años el eje se ajusta a los medios que pasan los filtros; en los años
  // se mira 2018 a 2026 completo para que la escala no salte al animar
  if (!tray && !MAPA_ANOS.includes(mapaPeriodo) && nodos.length) return escalaY(Math.max(1, ...nodos.map(n => n.y)));
  return escalaY(maxVar(mapaEjeY, !!tray));
}

/* Recorrido de un medio: su posición en cada año de 2018 a 2026, en la serie
   que se esté viendo (en «comparar», la de todos los tuits). Los años con
   menos de MUESTRA_MIN tuits con lado claro se saltan. */
function trayectoriaDe(handle) {
  const serie = mapaSerie === 'viral' ? 'viral' : 'publicado';
  const puntos = [], faltan = [];
  for (const ano of MAPA_ANOS) {
    const r = mediosPeriodoDe(ano).find(x => x.handle.toLowerCase() === handle.toLowerCase());
    const d = r && r[serie];
    if (d && d.posicion != null && d.con_lado >= MUESTRA_MIN) puntos.push({ ano, p: d.posicion, y: valorDe(d, mapaEjeY), d });
    else faltan.push(ano);
  }
  return { serie, puntos, faltan };
}
function quitarTrayectoria() {
  if (!mapaTrayectoria) return;
  mapaTrayectoria = '';
  renderMapa();
}
function pintarBarraTray(meta, tray) {
  const bar = $('#mapa-tray');
  if (!bar) return;
  if (!meta) { bar.hidden = true; bar.innerHTML = ''; return; }
  const n = tray.puntos.length;
  const texto = n < 2
    ? esc(t('trayPocos', meta.nombre))
    : `${t('trayTitulo', esc(meta.nombre), tray.puntos[0].ano, tray.puntos[n - 1].ano)}, ${t('traySerie', tray.serie)}.${tray.faltan.length ? ' ' + t('trayFaltan', tray.faltan.join(', ')) : ''}`;
  bar.innerHTML = `<p>${texto}</p>
    <div class="mapa-tray-acc"><button type="button" class="hallazgo-btn" data-tray="tuits">${t('trayTuits')}</button>
    <button type="button" class="hallazgo-btn" data-tray="quitar">${t('trayQuitar')}</button></div>`;
  bar.hidden = false;
}

function filasMapa() {
  const metas = new Map(INDEX.medios.map(m => [m.handle.toLowerCase(), m]));
  const nodos = [], parejas = [];
  for (const r of mediosPeriodo()) {
    const m = metas.get(r.handle.toLowerCase());
    if (!m) continue;
    if ((m.izq || 0) + (m.der || 0) <= SIGNIFICADOS_MIN) continue;
    if (!pasaCuentas(m)) continue;
    const pub = r.publicado, vir = r.viral;
    const okPub = pasaFiltro(pub);
    const okVir = pasaFiltro(vir);
    const nodoPub = { m, serie: 'publicado', p: pub ? pub.posicion : 0, y: valorDe(pub, mapaEjeY), d: pub, o: vir };
    const nodoVir = { m, serie: 'viral', p: vir ? vir.posicion : 0, y: valorDe(vir, mapaEjeY), d: vir, o: pub };
    if (mapaSerie === 'ambas') {
      if (!okPub || !okVir) continue;
      nodos.push(nodoPub, nodoVir);
      parejas.push({ m, p1: pub.posicion, y1: nodoPub.y, p2: vir.posicion, y2: nodoVir.y, pub, vir });
    } else if (mapaSerie === 'publicado' ? okPub : okVir) {
      nodos.push(mapaSerie === 'publicado' ? nodoPub : nodoVir);
    }
  }
  return { nodos, parejas };
}

/* Tamaño del lienzo. Fuera de la historia es el de siempre, 1000 por 620, y el SVG
   se escala al ancho. Dentro de la escena el mapa ocupa el hueco que queda bajo
   los controles: el lienzo toma su proporción y una escala cercana a la real, para
   que textos y logos no encojan. En pantallas estrechas se desliza en horizontal. */
function lienzoMapa() {
  const wrap = $('.chart-wrap');
  const enEscena = wrap && relatoActivo && !$('#relato').classList.contains('is-libre') && currentView === 'mapa';
  if (!enEscena) return { W: 1000, H: 620 };
  const cs = getComputedStyle(wrap);
  const cw = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const ch = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (cw < 50 || ch < 50) return { W: 1000, H: 620 };
  const pw = Math.floor(Math.max(cw, 600)), ph = Math.floor(ch);
  const W = Math.round(Math.min(1000, Math.max(900, pw)));
  const H = Math.round(Math.min(1100, Math.max(380, ph * W / pw)));
  return { W, H, pw, ph };
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
  const panelMapa = $('.panel-mapa');
  if (panelMapa) panelMapa.dataset.modo = mapaPartido ? 'partido' : 'lados';
  etiquetasTipo();
  etiquetasVariables();
  const filas = filasMapa();
  const metaTray = mapaTrayectoria ? INDEX.medios.find(m => m.handle.toLowerCase() === mapaTrayectoria.toLowerCase()) : null;
  if (mapaTrayectoria && !metaTray) mapaTrayectoria = '';
  const tray = metaTray ? trayectoriaDe(metaTray.handle) : null;
  pintarBarraTray(metaTray, tray);
  // con un recorrido abierto el eje usa la escala anual: en un año se atenúan los
  // demás medios; en la serie completa o la legislatura se ocultan, porque su escala no casa
  const nodos = !tray ? filas.nodos : MAPA_ANOS.includes(mapaPeriodo)
    ? filas.nodos.filter(n => n.m.handle !== metaTray.handle && (mapaSerie !== 'ambas' || n.serie === 'publicado'))
    : [];
  const parejas = tray ? [] : filas.parejas;
  const totalUniverso = mediosPeriodo().length;
  const admitidos = new Set(INDEX.medios
    .filter(m => (m.izq || 0) + (m.der || 0) > SIGNIFICADOS_MIN)
    .map(m => m.handle.toLowerCase()));
  const total = mediosPeriodo().filter(r => admitidos.has(r.handle.toLowerCase())).length;
  const dibujados = new Set(nodos.map(n => n.m.handle)).size;
  const fuera = total - dibujados;
  const fueraCorte = totalUniverso - total;

  const { W, H, pw, ph } = lienzoMapa();
  const M = { t: 46, r: 54, b: 66, l: 82 };
  const escala = maxYMapa(tray, nodos), yMax = escala.tope;
  maxTamMapa = maxVar(mapaTam);
  const lista = Array.from({ length: escala.tramos + 1 }, (_, i) => +(escala.paso * i).toPrecision(12));
  const px = v => M.l + v / 100 * (W - M.l - M.r);
  const PAD = 32;
  const py = v => H - M.b - Math.max(0, Math.min(yMax, v)) / yMax * (H - M.t - M.b - PAD);
  const mitad = px(50);

  const ZONAS = [
    [0, 20, tm('zonaMuyIzq'), 'z-miz'],
    [20, 40, tm('zonaIzq'), 'z-iz'],
    [40, 60, tm('zonaEq'), 'z-eq'],
    [60, 80, tm('zonaDer'), 'z-dr'],
    [80, 100, tm('zonaMuyDer'), 'z-mdr'],
  ];
  let g = '', etiquetas = '';
  ZONAS.forEach(([a, z, txt, cls]) => {
    const x = px(a), w = px(z) - x;
    g += `<rect class="zona ${cls}" x="${x.toFixed(1)}" y="${M.t}" width="${w.toFixed(1)}" height="${H - M.b - M.t}"></rect>`;
    etiquetas += `<text x="${(x + w / 2).toFixed(1)}" y="${M.t - 8}">${txt}</text>`;
  });
  lista.forEach(tick => {
    g += `<line x1="${M.l}" x2="${W - M.r}" y1="${py(tick).toFixed(1)}" y2="${py(tick).toFixed(1)}"></line>`;
    g += `<text x="${M.l - 11}" y="${(py(tick) + 4).toFixed(1)}" text-anchor="end">${nf(tick)}</text>`;
  });
  const EJEX = [[0, t('ticDerechaN', 0)], [20, t('ticDerechaN', 2)], [40, t('ticDerechaN', 4)], [50, t('ticMitad')],
                [60, t('ticDerechaN', 6)], [80, t('ticDerechaN', 8)], [100, t('ticDerechaN', 10)]];
  EJEX.forEach(([v, txt]) => {
    const x = px(v).toFixed(1), c = v === 50 ? 'mitad' : '';
    g += `<line class="${c}" x1="${x}" x2="${x}" y1="${M.t}" y2="${H - M.b}"></line>`;
    g += `<text class="${c}" x="${x}" y="${H - M.b + 21}" text-anchor="middle">${txt}</text>`;
  });
  const tituloPeriodo = periodoTxt()[mapaPeriodo] || mapaPeriodo;
  const tituloY = mapaEjeY === 'con_lado' ? tm('axisYTitle', tituloPeriodo) : t('varTitulo', mapaEjeY, mapaPartido, tituloPeriodo);
  g += `<text class="tit" x="${M.l}" y="18">${tituloY}</text>`;
  g += `<text class="tit" x="${M.l}" y="${H - M.b + 46}">${tm('axisLeft')}</text>`;
  g += `<text class="tit" x="${mitad.toFixed(1)}" y="${H - M.b + 46}" text-anchor="middle">${tm('axisMid')}</text>`;
  g += `<text class="tit" x="${W - M.r}" y="${H - M.b + 46}" text-anchor="end">${tm('axisRight')}</text>`;

  const flechas = parejas.map(f => {
    const x1 = px(f.p1), y1 = py(f.y1), x2 = px(f.p2), y2 = py(f.y2);
    const r1 = radioDe(f.pub), r2 = radioDe(f.vir);
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

  const encima = n => mapaDestacar === 'programas' && esPrograma(n.m) ? 1 : 0;
  const orden = nodos.slice().sort((a, b) => encima(a) - encima(b) || radioDe(b.d) - radioDe(a.d));
  const burbujas = orden.map((n, i) => {
    const r = radioDe(n.d);
    const cx = px(n.p), cy = py(n.y);
    const d = (r * 1.74).toFixed(1), off = (-r * 0.87).toFixed(1);
    const tenue = tray || (mapaDestacar === 'programas' && !esPrograma(n.m));
    const realce = !tray && mapaDestacar === 'programas' && esPrograma(n.m);
    return `<g class="burbuja burbuja-${n.serie} lado-${ladoDe(n.p)}${tenue ? ' atenuada' : ''}${realce ? ' destacada' : ''}" data-h="${esc(n.m.handle)}"
        data-serie="${n.serie}" data-posicion="${n.p.toFixed(1)}" data-y="${n.y}" data-rt-mediana="${n.d.rt_mediana}" data-y-max="${yMax}" data-i="${i}" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)})">
      <circle class="aro${n.serie === 'viral' ? ' dis' : ''}" r="${r.toFixed(1)}" stroke="${colorDe(n.p)}"></circle>
      <image href="${esc(n.m.logo)}" x="${off}" y="${off}" width="${d}" height="${d}"></image>
    </g>`;
  }).join('');

  let recorrido = '';
  if (tray && tray.puntos.length) {
    const pts = tray.puntos.map(q => ({ ...q, x: px(q.p), yy: py(q.y) }));
    const ult = pts[pts.length - 1];
    const rUlt = Math.max(14, radioDe(ult.d));
    pts.forEach((a, i) => {
      const b = pts[i + 1];
      if (!b) return;
      const dx = b.x - a.x, dy = b.yy - a.yy, L = Math.hypot(dx, dy);
      const rb = b === ult ? rUlt + 3 : 7;
      if (L < 7 + rb + 3) return;
      // en los saltos cortos la punta se encoge para que ningún tramo se quede sin flecha
      const ux = dx / L, uy = dy / L, c = colorDe(a.p), hl = Math.min(9, L - 7 - rb);
      const sx = a.x + ux * 7, sy = a.yy + uy * 7, ex = b.x - ux * rb, ey = b.yy - uy * rb;
      const bx = ex - ux * hl, by = ey - uy * hl, nx = -uy, ny = ux;
      recorrido += `<g class="tramo" data-de="${a.ano}" data-a="${b.ano}">
        <path d="M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${bx.toFixed(1)} ${by.toFixed(1)}" stroke="${c}"></path>
        <polygon fill="${c}" points="${ex.toFixed(1)},${ey.toFixed(1)} ${(bx + nx * 4.6).toFixed(1)},${(by + ny * 4.6).toFixed(1)} ${(bx - nx * 4.6).toFixed(1)},${(by - ny * 4.6).toFixed(1)}"></polygon>
      </g>`;
    });
    pts.forEach((q, i) => {
      // las etiquetas alternan arriba y abajo para que los años cercanos no se pisen
      const c = colorDe(q.p), arriba = q.yy - M.t > 30 && (i % 2 === 0 || H - M.b - q.yy < 24);
      if (q === ult) {
        const d = (rUlt * 1.74).toFixed(1), off = (-rUlt * 0.87).toFixed(1);
        recorrido += `<g class="paso paso-ultimo" data-ano="${q.ano}" data-posicion="${q.p.toFixed(1)}" data-y="${q.y}" transform="translate(${q.x.toFixed(1)},${q.yy.toFixed(1)})">
          <circle class="aro" r="${rUlt.toFixed(1)}" stroke="${c}"></circle>
          <image href="${esc(metaTray.logo)}" x="${off}" y="${off}" width="${d}" height="${d}"></image>
          <text y="${(arriba ? -rUlt - 7 : rUlt + 15).toFixed(1)}" text-anchor="middle">${q.ano}</text></g>`;
      } else {
        recorrido += `<g class="paso${i === 0 ? ' paso-primero' : ''}" data-ano="${q.ano}" data-posicion="${q.p.toFixed(1)}" data-y="${q.y}" transform="translate(${q.x.toFixed(1)},${q.yy.toFixed(1)})">
          <circle r="${i === 0 ? 7 : 5}" fill="${i === 0 ? 'var(--panel)' : c}" stroke="${c}"></circle>
          <text y="${arriba ? -11 : 19}" text-anchor="middle">${q.ano}</text></g>`;
      }
    });
  }

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.width = pw ? pw + 'px' : '';
  svg.style.height = ph ? ph + 'px' : '';
  svg.innerHTML = `<g class="grid">${g}</g><g class="flechas">${flechas}</g><g class="nodos">${burbujas}</g><g class="recorrido">${recorrido}</g><g class="etiquetas">${etiquetas}</g>`;
  svg.classList.toggle('con-recorrido', !!tray);
  // cada año del recorrido abre los tuits de la cuenta en ese año
  svg.querySelectorAll('.recorrido .paso').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    abrirCajon(metaTray.handle, { ano: el.dataset.ano });
  }));

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
    if (parejas.length) res.push(tm('mapaResDespSuLado', suLado, parejas.length));
    res.push(med === 0
      ? t('mapaResMedianaCero')
      : mapaPartido
        ? t('mapaResMedianaP', mapaPartido, decsep(Math.abs(med)), med > 0)
        : t('mapaResMediana', decsep(Math.abs(med)), med < 0 ? t('izquierda') : t('derecha')));
  } else {
    res.push(t('mapaResSolo', nf(dibujados), nombreSerie(mapaSerie)));
  }
  $('#mapa-resumen').textContent = tray ? t('trayAyudaQuitar') : res.join(' ');

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
    el.addEventListener('click', e => {
      e.stopPropagation();
      $('#mapa-tip').hidden = true;
      mapaTrayectoria = m.handle;
      renderMapa();
      abrirCajon(m.handle);
    });
  });

  const trayCajon = cajonAbierto() && $('#cajon .cajon-tray');
  if (trayCajon) { const txt = textoTrayCajon(); trayCajon.textContent = txt; trayCajon.hidden = !txt; }

  const bola = v => { const r = radioTam(v); return `<span class="bola" style="width:${(2 * r).toFixed(0)}px;height:${(2 * r).toFixed(0)}px"></span> ${nf(v)}${VARS_RT.includes(mapaTam) ? ' RT' : ''}`; };
  const refTam = redondoArriba(maxTamMapa) / 2;
  const bolas = `${bola(refTam / 10)} ${bola(refTam / 2)} ${bola(refTam)}`;
  const notaFiltro = mapaB200 ? t('mapaPieFiltroN', nf(BRECHA_MIN))
    : t('mapaPieFiltroTodos');
  $('#mapa-pie').innerHTML = `
    ${tray ? `<div class="blq"><strong>${t('mapaPieTray')}</strong> ${t('mapaPieTrayDesc')}</div>` : `<div class="blq">${t('trayAyuda')}</div>`}
    ${tipoFiltro() ? `<div class="blq"><strong>${t('mapaPieTipoK')}</strong> ${esc(t('mapaPieTipo', t('tipoNombre', tipoFiltro())))}</div>` : ''}
    ${mapaFiltro === 'generalistas' || mapaFiltro === 'programas' ? `<div class="blq"><strong>${t('mapaPieCuentasK')}</strong> ${t('mapaPieCuentas', mapaFiltro)}</div>` : ''}
    ${mapaDestacar && !tray ? `<div class="blq">${t('mapaPieDestacar')}</div>` : ''}
    ${mapaPartido ? `<div class="blq"><strong>${t('mapaPiePartidoK')}</strong> ${t('mapaPiePartido', mapaPartido)}</div>` : ''}
    <div class="blq"><strong>${t('mapaPieTam')}</strong> ${mapaTam === 'rt_mediana' && !mapaPartido ? t('mapaPieTamDesc') : t('varDesc', mapaTam, mapaPartido)} ${bolas}</div>
    <div class="blq"><strong>${t('mapaPieAro')}</strong> <span class="aro" style="border-color:var(--map-izq)"></span> ${tm('mapaPieIzq')}
      <span class="aro" style="border-color:var(--map-der);margin-left:10px"></span> ${tm('mapaPieDer')}
      <span class="aro" style="border-color:var(--map-neu);margin-left:10px"></span> ${tm('mapaPieCentro')}</div>
    ${mapaSerie === 'ambas' ? `<div class="blq"><strong>${t('mapaPieAroContinuo')}</strong> ${t('mapaPiePublicado')} · <strong>${t('mapaPieAroDiscontinuo')}</strong> ${t('mapaPieLoViral')}</div>
      <div class="blq"><strong>${t('mapaPieFlecha')}</strong> ${t('mapaPieFlechaDesc')}</div>` : ''}
    <div class="blq"><strong>${t('mapaPieAltura')}</strong> ${mapaEjeY === 'con_lado' ? tm('mapaPieAlturaDesc') : t('varDesc', mapaEjeY, mapaPartido)}</div>
    <div class="blq"><strong>${t('mapaPieCorte')}</strong> ${t('mapaPieCorteDesc')}</div>
    <div class="blq">${notaFiltro}</div>
    ${fueraCorte ? `<div class="blq">${t('mapaPieFueraCorte', fueraCorte)}</div>` : ''}
    ${fuera && !tray ? `<div class="blq">${t('mapaPieFuera', fuera)}</div>` : ''}`;
}

function lineaVars(n) {
  const extra = [...new Set([mapaEjeY, mapaTam])].filter(v => v !== 'con_lado' && v !== 'rt_mediana');
  if (!extra.length) return '';
  const fmt = v => VARS_RT.includes(v) ? decsep(valorDe(n.d, v)) : nf(valorDe(n.d, v));
  return `<div class="tv">${extra.map(v => `<b>${t('varOpcion', v, mapaPartido)}</b>: ${fmt(v)}`).join(' · ')}</div>`;
}
function etiquetasVariables() {
  const res = $('#ajustes-resumen');
  const cambios = [mapaSerie !== 'publicado', mapaEjeY !== 'con_lado', mapaTam !== 'rt_mediana', mapaB200].filter(Boolean).length;
  if (res) {
    res.textContent = t('ajustesResumen', cambios);
    res.title = `↕ ${t('varCorta', mapaEjeY)} · ◯ ${t('varCorta', mapaTam)}`;
  }
  const b200 = $('#mapa-b200');
  if (b200) b200.checked = mapaB200;
  ['#mapa-ejey', '#mapa-tam'].forEach(sel => {
    const el = $(sel);
    if (!el) return;
    el.querySelectorAll('option').forEach(op => {
      op.textContent = t('varOpcion', op.value, mapaPartido);
      op.hidden = op.disabled = VARS_PARTIDO.includes(op.value) && !mapaPartido;
    });
  });
}
async function asegurarPartidos() {
  if (PARTIDOS_MAPA) return true;
  try {
    PARTIDOS_MAPA = await pedirJSON('data/partidos.json' + VER);
    cachePartido = new WeakMap();
    return true;
  } catch (err) {
    return false;
  }
}
async function fijarVariableMapa(cual, valor) {
  valor = VARS_MAPA.includes(valor) ? valor : (cual === 'ejeY' ? 'con_lado' : 'rt_mediana');
  if (valor === 'rt_media' && !(await asegurarPartidos())) valor = cual === 'ejeY' ? 'con_lado' : 'rt_mediana';
  if (cual === 'ejeY') mapaEjeY = valor; else mapaTam = valor;
  $(cual === 'ejeY' ? '#mapa-ejey' : '#mapa-tam').value = valor;
  renderMapa();
}

function tipMapa(n, ev) {
  const tip = $('#mapa-tip'), wrap = $('.chart-wrap');
  const m = n.m;
  const pub = n.serie === 'publicado' ? n.d : n.o;
  const vir = n.serie === 'viral' ? n.d : n.o;
  const linea = (dat, etq) => dat && dat.posicion != null
    ? `<div class="tv"><b>${etq}</b>: ${decsep(dat.posicion)} ${tm('tipADerecha')}${dat.con_lado < 15 ? ' (' + t('tipMuestraCorta') + ')' : ''} · ${nf(dat.con_lado)} ${t('tipPctSerie')} · ${decsep(dat.rt_mediana)} RT ${t('tipRtMedia')}</div>`
    : '';
  let desplaz = '';
  if (pub && vir && pub.posicion != null && vir.posicion != null && vir.con_lado >= 5) {
    const delta = vir.posicion - pub.posicion;
    desplaz = Math.abs(delta) < 0.05
      ? `<div class="tv frase">${t('tipDesplazaQueda')}</div>`
      : `<div class="tv frase">${mapaPartido
        ? t('tipDesplazaP', mapaPartido, decsep(Math.abs(delta)), delta > 0)
        : t('tipDesplaza', decsep(Math.abs(delta)), delta < 0 ? t('izquierda') : t('derecha'))}</div>`;
  }
  const d = decimos(m), p = reparto(m);
  const frase = !d.claro
    ? `${t('tipSinLado')} (${nf(m.politicos)} ${t('tipPoliticos')})`
    : `${d.texto} (${nf(d.claro)} ${t('tipClaros')} ${nf(m.politicos)} ${t('tipPoliticos')}; ${p.sin} ${t('tipSinLadoPct')})`;
  // el desglose sale de partidos.json, del mismo periodo y serie que el punto
  let desglose = '';
  if (!PARTIDOS_MAPA) asegurarPartidos();
  else {
    const bloque = (PARTIDOS_MAPA.periodos || {})[mapaPeriodo];
    const fila = bloque && bloque.medios.find(r => r.h.toLowerCase() === m.handle.toLowerCase());
    if (fila) desglose = htmlDesglose(casillasDeFila(fila, n.serie === 'viral' ? 1 : 0), { resalta: mapaPartido, nota: false });
  }
  tip.innerHTML = `<div class="tt">${esc(m.nombre)}</div>
    ${m.tipo ? `<div class="tv tm">${esc(t('tipoNombre', m.tipo))}</div>` : ''}
    ${desglose ? `<div class="tv tm">${n.serie === 'viral' ? t('tipViral') : t('tipPublicado')}</div>${desglose}` : `<div class="tv frase">${esc(frase)}</div>`}
    ${linea(pub, t('tipPublicado'))}${linea(vir, t('tipViral'))}${desplaz}${lineaVars(n)}
    <div class="tv tm">${esc(m.handle)} · ${t('tipIndiceMuestra')} ${m.indice > 0 ? '+' : m.indice < 0 ? '−' : ''}${Math.abs(m.indice).toFixed(2)}</div>`;
  tip.hidden = false;
  const r = wrap.getBoundingClientRect();
  let x = ev.clientX - r.left + 16, y = ev.clientY - r.top + 14;
  if (x + tip.offsetWidth > r.width - 4) x = ev.clientX - r.left - tip.offsetWidth - 16;
  if (y + tip.offsetHeight > r.height - 4) y = Math.max(4, r.height - tip.offsetHeight - 4);
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

/* ---------- historia: lo que dicen los datos ----------
   Debajo del mapa. Las cifras se calculan aquí a partir de los mismos JSON
   que dibuja el mapa, así que siguen a los datos si se regeneran. La brecha
   viral solo se afirma con 200 tuits con lado claro en las dos series
   (AGENTS.md, regla 4). */
const BRECHA_MIN = 200;
const pct = (a, b) => b ? 100 * a / b : 0;
const fx = (v, d = 0) => new Intl.NumberFormat(LANG === 'en' ? 'en-US' : 'es-ES', { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);

function datosHistoria() {
  const P = POL.periodos;
  const todo = P.todo.medios;
  const metas = new Map(INDEX.medios.map(m => [m.handle.toLowerCase(), m]));
  const nombre = h => (metas.get(h.toLowerCase()) || {}).nombre || h;
  const suma = (filas, serie) => filas.reduce((a, r) => {
    const d = r[serie] || {};
    a.i += d.izq || 0; a.d += d.der || 0; a.t += d.tuits || 0;
    return a;
  }, { i: 0, d: 0, t: 0 });
  const derDe = x => pct(x.d, x.i + x.d);
  const conPos = r => r.publicado && r.publicado.posicion != null;

  const enMapa = todo.filter(r => {
    const m = metas.get(r.handle.toLowerCase());
    return m && (m.izq || 0) + (m.der || 0) > SIGNIFICADOS_MIN && conPos(r) && r.publicado.con_lado >= 5;
  });
  const lados = { izq: 0, der: 0, neu: 0 };
  enMapa.forEach(r => { lados[ladoDe(r.publicado.posicion)]++; });

  const pub = suma(todo, 'publicado'), vir = suma(todo, 'viral');
  const anos = MAPA_ANOS.filter(a => P[a]);

  const fuertes = todo.filter(r => conPos(r) && r.viral && r.viral.posicion != null &&
    r.publicado.con_lado >= BRECHA_MIN && r.viral.con_lado >= BRECHA_MIN);
  const alejan = fuertes.filter(r => {
    const a = r.publicado.posicion - 50, b = r.viral.posicion - 50;
    return a * b > 0 && Math.abs(b) > Math.abs(a);
  });
  const mayor = signo => alejan.filter(r => Math.sign(r.publicado.posicion - 50) === signo)
    .sort((x, y) => Math.abs(y.viral.posicion - y.publicado.posicion) - Math.abs(x.viral.posicion - x.publicado.posicion))[0];

  const porLado = lado => suma(todo.filter(r => conPos(r) && ladoDe(r.publicado.posicion) === lado), 'publicado');
  const virLado = lado => suma(todo.filter(r => conPos(r) && ladoDe(r.publicado.posicion) === lado), 'viral');

  const tot = INDEX.totales;
  const pp = tot.por_partido || {}, dir = tot.por_direccion || {};
  return {
    lados, nTot: enMapa.length,
    pub: derDe(pub), vir: derDe(vir), virI: vir.i, virD: vir.d,
    a0: derDe(suma(P[anos[0]].medios, 'publicado')), a1: derDe(suma(P[anos[anos.length - 1]].medios, 'publicado')),
    fuertes: fuertes.length, alejan: alejan.length, izq: mayor(-1), der: mayor(1), nombre,
    rI: pct(virLado('izq').t, porLado('izq').t), rD: pct(virLado('der').t, porLado('der').t),
    psoe: pp.PSOE || 0, resto: (pp.PP || 0) + (pp.Vox || 0) + (pp.Sumar || 0), clasif: tot.clasificados,
    perj: dir.perjudica || 0, ben: dir.beneficia || 0
  };
}

function marcarPartido() {
  $$('#mapa-partido [data-partido]').forEach(b => {
    const on = b.dataset.partido === mapaPartido;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
async function fijarPartidoMapa(valor) {
  const elegido = ['PSOE', 'PP', 'Vox', 'Sumar'].includes(valor) ? valor : '';
  if (elegido && !(await asegurarPartidos())) {
    mapaPartido = '';
    marcarPartido();
    renderMapa();
    return;
  }
  mapaPartido = elegido;
  marcarPartido();
  // «beneficia» y «perjudica» solo tienen sentido respecto a un partido
  if (!elegido && VARS_PARTIDO.includes(mapaEjeY)) { mapaEjeY = 'con_lado'; $('#mapa-ejey').value = mapaEjeY; }
  if (!elegido && VARS_PARTIDO.includes(mapaTam)) { mapaTam = 'rt_mediana'; $('#mapa-tam').value = mapaTam; }
  renderMapa();
}

function irAlMapa({ serie = 'publicado', filtro = 'todos', b200 = false, periodo = 'todo', play = false }) {
  pararEvolucion();
  salirRelato(false);
  mapaSerie = serie; mapaFiltro = filtro; mapaB200 = b200; mapaPartido = ''; mapaDestacar = '';
  mapaEjeY = 'con_lado'; mapaTam = 'rt_mediana'; mapaTrayectoria = '';
  sincronizarControles();
  fijarPeriodoMapa(periodo, true);
  $('.panel-mapa').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (play) reproducirEvolucion();
}
const ACCIONES_HISTORIA = {
  evolucion: () => irAlMapa({ play: true }),
  brecha: () => irAlMapa({ serie: 'ambas', b200: true }),
  viral: () => irAlMapa({ serie: 'viral' }),
  psoe: () => { location.hash = '#/contenidos?partido=PSOE'; }
};

function pintarHistoria() {
  const caja = $('#historia-hallazgos');
  if (!caja || !INDEX || !POL || !POL.periodos || !POL.periodos.todo) return;
  const h = datosHistoria();
  const r = v => fx(Math.round(v));
  const pos = v => fx(Math.round(v));
  const items = [
    { k: 'hist1', lado: 'der', cifra: `${r(h.pub)} %`, p: t('hist1P', h.lados.der, h.lados.izq, h.lados.neu, h.nTot, r(h.pub), r(h.a0), r(h.a1)), accion: 'evolucion' },
    (h.izq && h.der) ? { k: 'hist2', lado: 'mix', cifra: `${h.alejan}/${h.fuertes}`, p: t('hist2P', h.alejan, h.fuertes, BRECHA_MIN,
      h.nombre(h.izq.handle), pos(h.izq.publicado.posicion), pos(h.izq.viral.posicion),
      h.nombre(h.der.handle), pos(h.der.publicado.posicion), pos(h.der.viral.posicion)), accion: 'brecha' } : null,
    { k: 'hist3', lado: 'neu', cifra: `${r(h.vir)} %`, p: t('hist3P', r(h.pub), r(h.vir), nf(h.virI), nf(h.virD), fx(h.rI, 1), fx(h.rD, 1)), accion: 'viral' },
    { k: 'hist4', lado: 'izq', cifra: `${r(pct(h.psoe, h.clasif))} %`, p: t('hist4P', r(pct(h.psoe, h.clasif)), nf(h.psoe), nf(h.resto), nf(h.perj), nf(h.ben), fx(h.perj / Math.max(1, h.ben), 1)), accion: 'psoe' }
  ].filter(Boolean);
  caja.innerHTML = items.map((it, i) => `
    <li class="hallazgo lado-${it.lado}">
      <div class="hallazgo-cifra"><span class="hallazgo-n">${String(i + 1).padStart(2, '0')}</span><b>${it.cifra}</b></div>
      <div class="hallazgo-txt">
        <h3>${t(it.k + 'T')}</h3>
        <p>${it.p}</p>
        <button type="button" class="hallazgo-btn" data-accion="${it.accion}">${t(it.k + 'B')} →</button>
      </div>
    </li>`).join('');
}
document.addEventListener('click', e => {
  const b = e.target.closest('.hallazgo-btn');
  if (b && ACCIONES_HISTORIA[b.dataset.accion]) ACCIONES_HISTORIA[b.dataset.accion]();
});

/* ---------- historia guiada ----------
   Cinco pasos encima del mapa, como diapositivas. Cada paso fija unos filtros de
   partida y el mapa sigue vivo: se puede tocar, filtrar y pulsar cuentas sin
   salir del paso. Se avanza con los botones o haciendo scroll: la escena se queda
   pegada arriba y cada paso ocupa un tramo de la página. Las cifras se calculan
   aquí con los mismos datos que dibuja el mapa, así que siguen a los datos. */
const RELATO = [
  { k: 'relato1', preset: { filtro: 'generalistas' } },
  { k: 'relato2', preset: { filtro: 'todos', destacar: 'programas' } },
  { k: 'relato3', preset: { filtro: 'todos', tray: () => (ejemploRecorrido() || {}).handle || '' } },
  { k: 'relato4', preset: { filtro: 'todos', partido: 'PSOE' } },
  { k: 'relato5', preset: { filtro: 'todos' } },
];
let relatoActivo = true, relatoPaso = -1, relatoTurno = 0, relatoSaltando = false;

// posición de lo publicado en la serie completa, con el mismo corte con el que se dibuja el mapa
function posicionesTodo(filtro) {
  const metas = new Map(admitidosMapa().map(m => [m.handle.toLowerCase(), m]));
  return mediosPolDe('todo').map(r => ({ m: metas.get(r.handle.toLowerCase()), d: r.publicado }))
    .filter(x => x.m && pasaCuentas(x.m, filtro) && x.d && x.d.posicion != null && x.d.con_lado >= MUESTRA_MIN);
}
const distMedia = xs => xs.length ? xs.reduce((a, x) => a + Math.abs(x.d.posicion - 50), 0) / xs.length : 0;

/* El ejemplo del recorrido es la cuenta que más se ha movido entre el primer y el
   último año, entre las que tienen al menos 100 tuits con lado claro en cada año:
   así el cambio no sale de una muestra corta. */
let EJEMPLO;
function ejemploRecorrido() {
  if (EJEMPLO !== undefined) return EJEMPLO;
  let mejor = null;
  for (const m of admitidosMapa()) {
    const h = m.handle.toLowerCase();
    const pts = MAPA_ANOS.map(a => (mediosPolDe(a).find(r => r.handle.toLowerCase() === h) || {}).publicado);
    if (pts.some(d => !d || d.posicion == null || d.con_lado < 100)) continue;
    const p0 = pts[0].posicion, p1 = pts[pts.length - 1].posicion;
    if (!mejor || Math.abs(p1 - p0) > mejor.delta) mejor = { handle: m.handle, nombre: m.nombre, delta: Math.abs(p1 - p0), p0, p1 };
  }
  EJEMPLO = mejor;
  return EJEMPLO;
}
// cuántas cuentas publican más en contra de un partido que a su favor, en la serie completa
function contraPartido(p) {
  if (!PARTIDOS_MAPA || !PARTIDOS_MAPA.periodos || !PARTIDOS_MAPA.periodos.todo) return null;
  const porH = new Map(PARTIDOS_MAPA.periodos.todo.medios.map(r => [r.h.toLowerCase(), r]));
  let n = 0, contra = 0;
  for (const m of admitidosMapa()) {
    const q = porH.get(m.handle.toLowerCase());
    const d = q && q[p] && q[p][0];
    if (!d || d[0] + d[1] < MUESTRA_MIN) continue;
    n++;
    if (d[1] > d[0]) contra++;
  }
  return { n, contra };
}
function textoRelato(i) {
  const r = v => fx(Math.round(v));
  if (i === 0) {
    const xs = posicionesTodo('generalistas');
    const l = { izq: 0, der: 0, neu: 0 };
    xs.forEach(x => { l[ladoDe(x.d.posicion)]++; });
    return { p: t('relato1P', xs.length, l.izq, l.der, l.neu, r(distMedia(xs))) };
  }
  if (i === 1) {
    const pr = posicionesTodo('programas'), ge = posicionesTodo('generalistas');
    const der = pr.filter(x => x.d.posicion > 55).sort((a, b) => b.d.posicion - a.d.posicion)[0];
    const izq = pr.filter(x => x.d.posicion < 45).sort((a, b) => a.d.posicion - b.d.posicion)[0];
    return { p: t('relato2P', pr.length, r(distMedia(pr)), r(distMedia(ge)),
      der && { nombre: esc(der.m.nombre), v: r(der.d.posicion) },
      izq && { nombre: esc(izq.m.nombre), v: r(100 - izq.d.posicion) }) };
  }
  if (i === 2) {
    const ej = ejemploRecorrido();
    if (!ej) return { p: t('trayAyuda') };
    return {
      p: t('relato3P', esc(ej.nombre), MAPA_ANOS[0], r(ej.p0), MAPA_ANOS[MAPA_ANOS.length - 1], r(ej.p1)),
      accion: `<button type="button" class="hallazgo-btn" data-relato="tuits">${esc(t('relato3B', ej.nombre))}</button>`
    };
  }
  if (i === 3) {
    const c = contraPartido('PSOE');
    return { p: c ? t('relato4P', 'PSOE', c.contra, c.n) : t('relatoCargando') };
  }
  return { p: t('relato5P') };
}
function pintarRelato() {
  if (relatoPaso < 0 || !INDEX || !POL) return;
  const i = relatoPaso, n = RELATO.length;
  $('#relato-paso').textContent = t('relatoPaso', i + 1, n);
  $('#relato-titulo').textContent = t(RELATO[i].k + 'T');
  const tx = textoRelato(i);
  $('#relato-texto').innerHTML = tx.p;
  $('#relato-accion').innerHTML = tx.accion || '';
  $('#relato-ant').disabled = i === 0;
  $('#relato-sig').textContent = i === n - 1 ? t('relatoFin') : t('relatoSig');
  $('#relato-puntos').innerHTML = RELATO.map((_, j) =>
    `<button type="button" class="${j === i ? 'is-on' : ''}" data-paso="${j}" aria-label="${esc(t('relatoIr', j + 1))}"${j === i ? ' aria-current="step"' : ''}></button>`).join('');
}
function sincronizarControles() {
  const fija = (sel, v) => { const el = $(sel); if (el) el.value = v; };
  fija('#mapa-serie', mapaSerie);
  fija('#mapa-filtro', mapaFiltro);
  fija('#mapa-ejey', mapaEjeY);
  fija('#mapa-tam', mapaTam);
  fija('#mapa-periodo', mapaPeriodo);
  const b = $('#mapa-b200');
  if (b) b.checked = mapaB200;
  marcarPartido();
}
async function aplicarPaso(i) {
  const turno = ++relatoTurno;
  const p = RELATO[i].preset;
  pararEvolucion();
  if (cajonAbierto()) cerrarCajon();
  if (p.partido && !(await asegurarPartidos())) p.partido = '';
  if (turno !== relatoTurno) return;
  mapaSerie = 'publicado'; mapaB200 = false; mapaEjeY = 'con_lado'; mapaTam = 'rt_mediana';
  mapaFiltro = p.filtro || 'todos';
  mapaDestacar = p.destacar || '';
  mapaTrayectoria = typeof p.tray === 'function' ? p.tray() : (p.tray || '');
  mapaPeriodo = 'todo';
  mapaPartido = p.partido || '';
  sincronizarControles();
  // solo limpia el periodo de la URL del mapa: al arrancar en otra sección, su URL se respeta
  const rutaHash = location.hash.replace(/^#\/?/, '').split('?')[0];
  if (currentView === 'mapa' && (!rutaHash || rutaHash === 'mapa') && location.hash.includes('?')) history.replaceState(null, '', '#/mapa');
  renderMapa();
  pintarRelato();
}
function irAPaso(i) {
  i = Math.max(0, Math.min(RELATO.length - 1, i));
  if (i === relatoPaso) return;
  relatoPaso = i;
  pintarRelato();
  aplicarPaso(i);
}
// lleva la página al tramo del paso: el observador lo da por activo al cruzar la mitad de la pantalla
function desplazarAPaso(i) {
  const el = $(`.relato-paso[data-paso="${i}"]`);
  irAPaso(i);
  if (!el) return;
  relatoSaltando = true;
  const destino = el.getBoundingClientRect().top + scrollY - innerHeight * 0.5 + 6;
  const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  scrollTo({ top: Math.max(0, destino), behavior: suave ? 'smooth' : 'auto' });
  clearTimeout(desplazarAPaso.t);
  desplazarAPaso.t = setTimeout(() => { relatoSaltando = false; }, suave ? 1100 : 60);
}
function salirRelato(desplazar) {
  relatoActivo = false;
  $('#relato').classList.add('is-libre');
  mapaDestacar = '';
  renderMapa();
  if (desplazar) $('.panel-mapa').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function entrarRelato() {
  relatoActivo = true;
  $('#relato').classList.remove('is-libre');
  relatoPaso = -1;
  irAPaso(0);
  $('#relato').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function iniciarRelato() {
  const pasos = $('#relato-pasos');
  pasos.innerHTML = RELATO.map((_, i) => `<div class="relato-paso" data-paso="${i}"></div>`).join('');
  const nav = $('.nav');
  const fijarNav = () => document.documentElement.style.setProperty('--nav-h', (nav ? nav.offsetHeight : 0) + 'px');
  fijarNav();
  // el lienzo de la escena depende del hueco disponible: se redibuja al cambiar el tamaño
  let tRes = null;
  addEventListener('resize', () => {
    fijarNav();
    clearTimeout(tRes);
    tRes = setTimeout(() => { if (currentView === 'mapa' && relatoActivo) renderMapa(); }, 150);
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entradas => {
      if (!relatoActivo || relatoSaltando || currentView !== 'mapa') return;
      for (const e of entradas) if (e.isIntersecting) irAPaso(Number(e.target.dataset.paso));
    }, { rootMargin: '-50% 0px -50% 0px' });
    $$('.relato-paso', pasos).forEach(el => io.observe(el));
  }
  $('#relato-sig').addEventListener('click', () => {
    if (relatoPaso >= RELATO.length - 1) $('#historia').scrollIntoView({ behavior: 'smooth', block: 'start' });
    else desplazarAPaso(relatoPaso + 1);
  });
  $('#relato-ant').addEventListener('click', () => desplazarAPaso(relatoPaso - 1));
  $('#relato-puntos').addEventListener('click', e => {
    const b = e.target.closest('[data-paso]');
    if (b) desplazarAPaso(Number(b.dataset.paso));
  });
  $('#relato-salir').addEventListener('click', () => salirRelato(true));
  $('#relato-volver').addEventListener('click', entrarRelato);
  $('#relato-accion').addEventListener('click', e => {
    const ej = ejemploRecorrido();
    if (e.target.closest('[data-relato="tuits"]') && ej) abrirCajon(ej.handle);
  });
  // quien llega con un periodo en el enlace viene a explorar, no a la historia
  const bruto = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (leePeriodoDeUrl(bruto)) salirRelato(false);
  else irAPaso(0);
}

/* ---------- panel de tuits de una cuenta ----------
   Al pulsar una cuenta del mapa se abre a la vez su recorrido en el mapa y este
   panel con sus tuits: se ordenan por retuits, me gusta, vistas o fecha y se
   filtran por partido, sentido y año. Usa los mismos ficheros troceados por año
   que la ficha completa. */
const CAJON_PAGINA = 20;
/* Orden «lo que más pesa en su lado»: primero las casillas del lado que gana,
   de la que más tuits tiene a la que menos (en un medio a la izquierda, por
   ejemplo, los que critican al PP), luego las del otro lado y al final los que
   no tienen lado claro. Dentro de cada casilla, por retuits. */
const claveCasilla = tw => empujeDe(tw.p, tw.d) ? tw.p + '|' + tw.d : '';
function ordenPorPeso(ts, casillas) {
  const l = lecturaCasillas(casillas);
  const gana = l.izq >= l.der ? 'izq' : 'der';
  const peso = tw => {
    const lado = empujeDe(tw.p, tw.d);
    return !lado ? -1 : casillas[tw.p][tw.d] + (lado === gana ? l.claro + 1 : 0);
  };
  return ts.slice().sort((a, b) => (peso(b) - peso(a)) || claveCasilla(a).localeCompare(claveCasilla(b)) || (b.rt || 0) - (a.rt || 0));
}
// la lista ordenada por peso lleva una cabecera cada vez que cambia de casilla
function listaPorGrupos(ts, casillas, pinta) {
  const l = lecturaCasillas(casillas);
  let previa = null, html = '';
  for (const tw of ts) {
    const k = claveCasilla(tw);
    if (k !== previa) {
      previa = k;
      const lado = empujeDe(tw.p, tw.d);
      const n = lado ? casillas[tw.p][tw.d] : null;
      html += `<h3 class="grupo-lado ${lado || 'sin'}">${lado ? t('dgGrupo', tw.p, tw.d) : t('dgGrupoSin')}
        <span>${lado ? t('dgGrupoN', nf(n), fx(100 * n / (l.claro || 1))) : ''}</span></h3>`;
    }
    html += pinta(tw);
  }
  return html;
}
let CJ = null;
const TUITS = new Map();
function cargarTuitsDe(meta) {
  if (!TUITS.has(meta.handle)) {
    const prom = (async () => {
      const manifest = await pedirJSON('data/' + meta.archivo + VER);
      const base = 'data/' + meta.archivo.replace(/index\.json$/, '');
      const trozos = await Promise.all((manifest.particiones || []).map(part => pedirJSON(base + part.archivo + VER)));
      return { ...manifest, tweets: trozos.flatMap(tr => tr.tweets || []) };
    })();
    prom.catch(() => TUITS.delete(meta.handle));
    TUITS.set(meta.handle, prom);
  }
  return TUITS.get(meta.handle);
}
const cajonAbierto = () => { const c = $('#cajon'); return !!c && !c.hidden; };
async function abrirCajon(handle, opts = {}) {
  const meta = metaDe(handle);
  if (!meta) return;
  if (!CJ || CJ.meta.handle !== meta.handle) {
    CJ = { meta, tweets: null, error: false, partido: mapaPartido || '', dir: '', ano: '', orden: 'peso', texto: '', soloPol: true, n: CAJON_PAGINA };
  }
  if (opts.ano !== undefined) { CJ.ano = opts.ano; CJ.n = CAJON_PAGINA; }
  const caja = $('#cajon');
  caja.hidden = false;
  const yaAbierto = document.body.classList.contains('con-cajon');
  document.body.classList.add('con-cajon');
  if (!yaAbierto && currentView === 'mapa') renderMapa();
  pintarCajon();
  caja.scrollTop = 0;
  if (!CJ.tweets && !CJ.error) {
    const yo = CJ;
    try { yo.tweets = (await cargarTuitsDe(meta)).tweets; } catch (err) { yo.error = true; }
    if (CJ === yo) pintarCajon();
  }
}
function cerrarCajon() {
  const caja = $('#cajon');
  if (!caja) return;
  const estaba = !caja.hidden;
  caja.hidden = true;
  document.body.classList.remove('con-cajon');
  if (estaba && currentView === 'mapa' && INDEX) renderMapa();
}
// el recorrido sigue al eje del mapa: izquierda y derecha o un partido
function textoTrayCajon() {
  if (!CJ) return '';
  const tray = trayectoriaDe(CJ.meta.handle);
  const n = tray.puntos.length;
  const r = v => fx(Math.round(v));
  return n >= 2
    ? t('cajonRecorrido', tray.puntos[0].ano, r(tray.puntos[0].p), tray.puntos[n - 1].ano, r(tray.puntos[n - 1].p), mapaPartido)
    : '';
}
function pintarCajon() {
  if (!CJ) return;
  const m = CJ.meta;
  const recorrido = textoTrayCajon();
  $('#cajon').innerHTML = `
    <div class="cajon-cab">
      ${m.logo ? `<img class="cajon-logo" src="${esc(m.logo)}" alt="">` : ''}
      <div class="cajon-nombre">
        <h2>${esc(m.nombre)}</h2>
        <p class="cajon-sub">${esc(m.handle)}${m.tipo ? ' · ' + esc(t('tipoNombre', m.tipo)) : ''}</p>
      </div>
      <button type="button" class="cajon-x" data-cj="cerrar" aria-label="${esc(t('cajonCerrar'))}">✕</button>
    </div>
    <p class="cajon-tray"${recorrido ? '' : ' hidden'}>${recorrido}</p>
    <div class="cajon-dg" id="cj-dg"></div>
    <div class="cajon-filtros">
      <input type="search" id="cj-q" placeholder="${esc(t('cajonBuscar'))}" autocomplete="off" value="${esc(CJ.texto)}">
      <div class="cj-fila"><span class="ctl-k">${t('cajonPartido')}</span><div class="cj-chips" id="cj-partidos"></div></div>
      <div class="cj-fila"><span class="ctl-k">${t('cajonSentido')}</span><div class="cj-chips" id="cj-dirs"></div></div>
      <div class="cj-sels">
        <label class="ctl"><span class="ctl-k">${t('cajonAno')}</span><select id="cj-ano"></select></label>
        <label class="ctl"><span class="ctl-k">${t('cajonOrden')}</span><select id="cj-orden">
          ${['peso', 'rt', 'lk', 'vw', 'f', 'fa'].map(k => `<option value="${k}">${t('cajonOrdenOp', k)}</option>`).join('')}
        </select></label>
      </div>
      <label class="cj-check"><input type="checkbox" id="cj-pol"${CJ.soloPol ? ' checked' : ''}> ${t('cajonSoloPol')}</label>
    </div>
    <div class="cajon-res" id="cj-res"></div>
    <div class="cajon-lista" id="cj-lista"></div>
    <button type="button" class="more" id="cj-mas" hidden></button>
    <a class="cajon-ficha" href="#/medio/${esc(m.handle.replace('@', ''))}">${t('cajonFicha')}</a>`;
  $('#cj-orden').value = CJ.orden;
  pintarCajonLista();
}
function pintarCajonLista() {
  const lista = $('#cj-lista');
  if (!CJ || !lista) return;
  if (CJ.error || !CJ.tweets) {
    lista.innerHTML = `<p class="empty">${t(CJ.error ? 'cajonError' : 'cajonCargando')}</p>`;
    $('#cj-res').innerHTML = '';
    $('#cj-partidos').innerHTML = $('#cj-dirs').innerHTML = $('#cj-ano').innerHTML = '';
    return;
  }
  const q = CJ.texto.trim().toLowerCase();
  const anoDe = tw => (tw.f || '').slice(0, 4);
  const base = CJ.tweets.filter(tw => (!CJ.soloPol || tw.p) && (!q || tw.t.toLowerCase().includes(q)));
  const cPart = {}, cDir = {}, cAno = {};
  for (const tw of base) {
    const okA = !CJ.ano || anoDe(tw) === CJ.ano, okP = !CJ.partido || tw.p === CJ.partido, okD = !CJ.dir || tw.d === CJ.dir;
    if (okA && okD && tw.p) cPart[tw.p] = (cPart[tw.p] || 0) + 1;
    if (okA && okP && tw.d) cDir[tw.d] = (cDir[tw.d] || 0) + 1;
    if (okP && okD) cAno[anoDe(tw)] = (cAno[anoDe(tw)] || 0) + 1;
  }
  let ts = base.filter(tw => (!CJ.ano || anoDe(tw) === CJ.ano) && (!CJ.partido || tw.p === CJ.partido) && (!CJ.dir || tw.d === CJ.dir));
  // el desglose cuenta el año y la búsqueda, no el partido ni el sentido: así se
  // ve el conjunto y cada barra sirve de filtro
  const casillas = casillasDeTuits(base.filter(tw => !CJ.ano || anoDe(tw) === CJ.ano));
  const dg = htmlDesglose(casillas, { clic: true, activo: CJ.partido && CJ.dir ? { p: CJ.partido, d: CJ.dir } : null });
  $('#cj-dg').innerHTML = dg ? dg + `<p class="dg-pulsa">${t('dgPulsa')}</p>` : '';
  const o = CJ.orden;
  ts = o === 'peso' ? ordenPorPeso(ts, casillas) : ts.slice().sort((a, b) => o === 'f' ? (a.f < b.f ? 1 : a.f > b.f ? -1 : 0)
    : o === 'fa' ? (a.f > b.f ? 1 : a.f < b.f ? -1 : 0) : (b[o] || 0) - (a[o] || 0));

  const chip = (attr, val, txt, cuenta, cls) => `<button type="button" class="cj-chip ${cls || ''}${(attr === 'p' ? CJ.partido : CJ.dir) === val ? ' is-on' : ''}"
      data-cj${attr}="${val}" aria-pressed="${(attr === 'p' ? CJ.partido : CJ.dir) === val}">${txt}${cuenta != null ? ` <span>${nf(cuenta)}</span>` : ''}</button>`;
  $('#cj-partidos').innerHTML = chip('p', '', t('cajonTodos'), null) +
    PARTIDOS.filter(p => cPart[p] || p === CJ.partido).map(p => chip('p', p, p, cPart[p] || 0, CHIP[p])).join('');
  $('#cj-dirs').innerHTML = chip('d', '', t('cajonTodos'), null) +
    ['beneficia', 'perjudica', 'neutro'].filter(d => cDir[d] || d === CJ.dir)
      .map(d => chip('d', d, t('cajonDir', d, ['PSOE', 'PP', 'Vox', 'Sumar'].includes(CJ.partido) ? CJ.partido : ''), cDir[d] || 0, DIRCHIP[d])).join('');
  const anos = Object.keys(cAno).filter(Boolean).sort();
  $('#cj-ano').innerHTML = `<option value="">${t('cajonTodosAnos')}</option>` +
    [...new Set([...anos, CJ.ano].filter(Boolean))].sort().map(a => `<option value="${a}">${a} (${nf(cAno[a] || 0)})</option>`).join('');
  $('#cj-ano').value = CJ.ano;

  $('#cj-res').innerHTML = htmlResumen(ts);
  lista.innerHTML = ts.length
    ? (o === 'peso' ? listaPorGrupos(ts.slice(0, CJ.n), casillas, tw => tarjeta(tw, CJ.meta.handle, CJ.meta.nombre))
      : ts.slice(0, CJ.n).map(tw => tarjeta(tw, CJ.meta.handle, CJ.meta.nombre)).join(''))
    : `<p class="empty">${t('cajonVacio')}</p>`;
  const mas = $('#cj-mas');
  mas.hidden = ts.length <= CJ.n;
  mas.textContent = t('cajonMas', nf(Math.min(CAJON_PAGINA, ts.length - CJ.n)));
}
function iniciarCajon() {
  const caja = $('#cajon');
  caja.addEventListener('click', e => {
    if (e.target.closest('[data-cj="cerrar"]')) { cerrarCajon(); return; }
    const p = e.target.closest('[data-cjp]');
    if (p) { CJ.partido = p.dataset.cjp; CJ.n = CAJON_PAGINA; pintarCajonLista(); return; }
    const d = e.target.closest('[data-cjd]');
    if (d) { CJ.dir = d.dataset.cjd; CJ.n = CAJON_PAGINA; pintarCajonLista(); return; }
    const modo = e.target.closest('[data-dgmodo]');
    if (modo) { fijarModoDesglose(modo.dataset.dgmodo); pintarCajonLista(); return; }
    // una barra del desglose filtra por su partido y sentido; pulsarla otra vez lo quita
    const b = e.target.closest('[data-dgp]');
    if (b) {
      const on = CJ.partido === b.dataset.dgp && CJ.dir === b.dataset.dgd;
      CJ.partido = on ? '' : b.dataset.dgp;
      CJ.dir = on ? '' : b.dataset.dgd;
      CJ.n = CAJON_PAGINA;
      pintarCajonLista();
      return;
    }
    if (e.target.closest('#cj-mas')) { CJ.n += CAJON_PAGINA; pintarCajonLista(); }
  });
  caja.addEventListener('input', e => {
    if (e.target.id === 'cj-q') { CJ.texto = e.target.value; CJ.n = CAJON_PAGINA; pintarCajonLista(); }
  });
  caja.addEventListener('change', e => {
    if (e.target.id === 'cj-ano') CJ.ano = e.target.value;
    else if (e.target.id === 'cj-orden') CJ.orden = e.target.value;
    else if (e.target.id === 'cj-pol') CJ.soloPol = e.target.checked;
    else return;
    CJ.n = CAJON_PAGINA;
    pintarCajonLista();
  });
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
  if (currentView === 'contenidos') pintarContenidos();
  if (currentView === 'tendencias') pintarTendencias();
  renderMapa();
  pintarHistoria();
  pintarRelato();
  if (cajonAbierto()) pintarCajon();
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
  const forced = pref === 'system' ? null : (resolved === 'dark' ? '#1a1613' : '#f5efe3');
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
  asegurarPartidos(); // sin esperar: la tarjeta del mapa lo usa para explicar el lado de cada medio
  $('#mapa-serie').addEventListener('change', e => { mapaSerie = e.target.value; renderMapa(); });
  $('#mapa-filtro').value = mapaFiltro;
  $('#mapa-filtro').addEventListener('change', e => {
    mapaFiltro = filtrosMapa().includes(e.target.value) ? e.target.value : 'todos';
    mapaDestacar = '';
    renderMapa();
  });
  $('#mapa-b200').addEventListener('change', e => { mapaB200 = e.target.checked; renderMapa(); });
  $('#mapa-partido').addEventListener('click', e => {
    const b = e.target.closest('[data-partido]');
    if (b) fijarPartidoMapa(b.dataset.partido);
  });
  // el configurador de ejes se cierra al pulsar fuera de él
  document.addEventListener('click', e => {
    const aj = $('#mapa-ajustes');
    if (aj && aj.open && !aj.contains(e.target)) aj.open = false;
  });
  $('#mapa').addEventListener('click', e => { if (!e.target.closest('.burbuja, .paso-ultimo')) quitarTrayectoria(); });
  document.addEventListener('keydown', e => {
    // con la historia en pantalla, las flechas del teclado pasan de paso
    const escribiendo = e.target.closest && e.target.closest('input, select, textarea');
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !escribiendo && relatoActivo && currentView === 'mapa' && !cajonAbierto()) {
      const r = $('#relato').getBoundingClientRect();
      if (r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5) {
        e.preventDefault();
        desplazarAPaso(relatoPaso + (e.key === 'ArrowRight' ? 1 : -1));
      }
      return;
    }
    if (e.key !== 'Escape') return;
    if (cajonAbierto()) { cerrarCajon(); return; }
    if (currentView === 'mapa') quitarTrayectoria();
  });
  $('#mapa-tray').addEventListener('click', e => {
    const b = e.target.closest('[data-tray]');
    if (!b) return;
    if (b.dataset.tray === 'tuits' && mapaTrayectoria) abrirCajon(mapaTrayectoria);
    else quitarTrayectoria();
  });
  $('#mapa-ejey').addEventListener('change', e => fijarVariableMapa('ejeY', e.target.value));
  $('#mapa-tam').addEventListener('change', e => fijarVariableMapa('tam', e.target.value));
  const selPer = $('#mapa-periodo');
  if (selPer) {
    selPer.value = mapaPeriodo;
    selPer.addEventListener('change', e => fijarPeriodoMapa(e.target.value, true));
  }
  const play = $('#mapa-play');
  if (play) play.addEventListener('click', reproducirEvolucion);
  actualizarPlay();
  pintarHistoria();
  iniciarRelato();
  iniciarCajon();
  iniciarContenidos();
  iniciarTendencias();
  iniciarDescargas();
  route();
  // en pantallas estrechas el mapa se desplaza en horizontal: se abre centrado en el equilibrio
  const cw = $('.chart-wrap');
  if (cw && cw.scrollWidth > cw.clientWidth) cw.scrollLeft = (cw.scrollWidth - cw.clientWidth) / 2;
})();
