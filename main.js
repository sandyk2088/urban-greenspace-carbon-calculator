// ... other code ...

// ========== SOIL FORM ==========
const soilForm = document.getElementById('soilForm');
if (soilForm) {
  // Get values from field measurements page
  const FIELD_KEY = 'ugcc_field';
  const fieldData = loadData(FIELD_KEY, {});

  // Bulk density table from image1
  const bulkDensityTable = {
    "Sand": 1.56,
    "Loamy sand": 1.54,
    "Sandy loam": 1.50,
    "Loam": 1.45,
    "Silt loam": 1.20,
    "Sandy clay loam": 1.63,
    "Silty clay": 1.55,
    "Clay loam": 1.45,
    "Silty clay loam": 1.40,
    "Red clayey soils": 1.10,
    "Soils that formed in volcanic ash": 0.80,
    "Organic matter": 0.22
  };

  // Estimate bulk density using image2 equation
  function estimateBulkDensity(soilTexture, organicMatterPercent) {
    const soilBD = bulkDensityTable[soilTexture];
    const organicBD = bulkDensityTable["Organic matter"];
    const OM = organicMatterPercent; // % organic matter

    if (!soilBD || !organicBD || OM == null || OM < 0 || OM > 100) return null;

    const denominator = (OM / organicBD) + ((100 - OM) / soilBD);
    return 100 / denominator;
  }

  // Soil organic matter calculation from image3
  // SOM (lbs/ac-depth) = (OM% * 10,000) * (bulk density) * (sample depth [cm] / 10) * 0.893
  function calculateSoilOrganicMatter(organicMatterPercent, bulkDensity, sampleDepthCm = 30) {
    // Default sample depth: 30 cm
    const ppm = organicMatterPercent * 10000;
    const depthFactor = sampleDepthCm / 10;
    const conversion = 0.893;
    return ppm * bulkDensity * depthFactor * conversion;
  }

  // Convert SOM to Soil Organic Carbon (SOC) in lbs/ac-depth
  function calculateSoilOrganicCarbon(somLbsAcDepth) {
    // SOC = SOM * 0.58
    return somLbsAcDepth * 0.58;
  }

  // Convert lbs/ac-depth to tonnes/acre
  function lbsPerAcreToTonnesPerAcre(lbs) {
    return lbs / 2204.62;
  }

  function getSoilSummaryHTML(field) {
    // Soil texture
    const soilType = field.soilType || '';
    // Area
    const soilArea = field.totalArea || '';
    // Moisture
    const soilMoisture = field.soilMoisture || '';
    // Munsell color
    const soilHue = field.soilHue || '';
    const soilValue = field.soilValue || '';
    const soilChroma = field.soilChroma || '';

    function getTextureGroup(soilType) {
      if (soilType === "Sand") return "S";
      if (["Loamy Sand","Sandy Loam","Loam"].includes(soilType)) return "LS_SL_L";
      return "SiL_Si_SiCL_CL_SCL_SC_SiC_C";
    }
    // SOM lookup table (as previously defined)
    const SOM_TABLE = [
      // Moist
      { moisture: "Moist", value: 7, S: "<0.3", LS_SL_L: "", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "" },
      { moisture: "Moist", value: 6.5, S: "0.3-0.6", LS_SL_L: "", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "" },
      { moisture: "Moist", value: 6, S: "0.6-1", LS_SL_L: "", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "" },
      { moisture: "Moist", value: 5.5, S: "1-1.5", LS_SL_L: "", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "" },
      { moisture: "Moist", value: 5, S: "<0.3", LS_SL_L: "<0.4", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "<0.3" },
      { moisture: "Moist", value: 4.5, S: "0.3-0.6", LS_SL_L: "0.4-0.6", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "0.3-0.6" },
      { moisture: "Moist", value: 4, S: "0.6-1.0", LS_SL_L: "0.6-1.0", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "0.6-1.5" },
      { moisture: "Moist", value: 3.5, S: "0.9-1.5", LS_SL_L: "1-2", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "1-5" },
      { moisture: "Moist", value: 3, S: "1.5-3", LS_SL_L: "2-4", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "4-8" },
      { moisture: "Moist", value: 2.5, S: ">3", LS_SL_L: ">4", SiL_Si_SiCL_CL_SCL_SC_SiC_C: ">8" },
      { moisture: "Moist", value: 2, S: ">6", LS_SL_L: ">6", SiL_Si_SiCL_CL_SCL_SC_SiC_C: ">12" },
      // Dry
      { moisture: "Dry", value: 7, S: "<0.3", LS_SL_L: "<0.5", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "<0.6" },
      { moisture: "Dry", value: 6.5, S: "0.3-0.6", LS_SL_L: "0.5-0.8", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "0.6-1.2" },
      { moisture: "Dry", value: 6, S: "0.6-1", LS_SL_L: "0.8-1.2", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "1.2-2" },
      { moisture: "Dry", value: 5.5, S: "1-1.5", LS_SL_L: "1.2-2", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "2-4" },
      { moisture: "Dry", value: 5, S: "1.5-2", LS_SL_L: "2-4", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "3-4" },
      { moisture: "Dry", value: 4.5, S: "2-3", LS_SL_L: "4-6", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "4-6" },
      { moisture: "Dry", value: 4, S: "3-5", LS_SL_L: "6-9", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "6-9" },
      { moisture: "Dry", value: 3.5, S: "5-8", LS_SL_L: "9-15", SiL_Si_SiCL_CL_SCL_SC_SiC_C: "9-15" },
      { moisture: "Dry", value: 3, S: ">8", LS_SL_L: ">15", SiL_Si_SiCL_CL_SCL_SC_SiC_C: ">15" },
      { moisture: "Dry", value: 2.5, S: ">8", LS_SL_L: ">15", SiL_Si_SiCL_CL_SCL_SC_SiC_C: ">15" },
      { moisture: "Dry", value: 2, S: ">12", LS_SL_L: ">15", SiL_Si_SiCL_CL_SCL_SC_SiC_C: ">15" }
    ];
    function estimateSOM(moisture, value, chroma, soilType) {
      if (!moisture || !soilType || isNaN(value) || isNaN(chroma)) return "";
      let valueAdj = value;
      if (chroma >= 3.5 && chroma <= 6) valueAdj += 0.5;
      else if (chroma > 6) valueAdj += 1.0;
      let closest = SOM_TABLE.filter(row => row.moisture === moisture)
        .reduce((a, b) => Math.abs(b.value - valueAdj) < Math.abs(a.value - valueAdj) ? b : a);
      const texGroup = getTextureGroup(soilType);
      const somRange = closest[texGroup] || "";
      if (somRange) {
        return `Estimated Soil Organic Matter: <b>${somRange}%</b> 
          (for ${moisture.toLowerCase()} soil, ${soilType}, Munsell value ${value}${chroma ? ", chroma " + chroma : ""})`;
      } else {
        return `No organic matter range found for these parameters.`;
      }
    }
    const somEstimate = estimateSOM(soilMoisture, parseFloat(soilValue), parseFloat(soilChroma), soilType);

    // For calculation, try to get a representative value from the range (if any)
    let organicMatterPercent = null;
    if (somEstimate && somEstimate.match(/(\d+(\.\d+)?)/)) {
      // If somEstimate includes e.g. "0.6-1.0%", take the mean
      const match = somEstimate.match(/(\d+(\.\d+)?)(-(\d+(\.\d+)?))?/);
      if (match) {
        if (match[4]) {
          organicMatterPercent = (parseFloat(match[1]) + parseFloat(match[4])) / 2;
        } else {
          organicMatterPercent = parseFloat(match[1]);
        }
      }
    }

    // Calculate bulk density if possible
    let bulkDensityStr = '';
    let bulkDensity = null;
    if (organicMatterPercent !== null) {
      bulkDensity = estimateBulkDensity(soilType, organicMatterPercent);
      if (bulkDensity) {
        bulkDensityStr = `<b>Estimated Bulk Density:</b> ${bulkDensity.toFixed(2)} g/cm³ 
          <br><small>Calculated using average bulk density for ${soilType} and organic matter from Rawls (1983), 
          and organic matter percentage estimated from Munsell soil colour.</small>`;
      }
    }

    // Calculate soil organic matter (lbs/ac-depth) using image3 equation
    let somLbsAcDepthStr = '';
    let somLbsAcDepth = null;
    if (organicMatterPercent !== null && bulkDensity !== null) {
      // Use default sample depth 30 cm unless specified
      const sampleDepthCm = field.sampleDepthCm || 30;
      somLbsAcDepth = calculateSoilOrganicMatter(organicMatterPercent, bulkDensity, sampleDepthCm);
      somLbsAcDepthStr = `<b>Estimated Soil Organic Matter (SOM):</b> ${somLbsAcDepth.toLocaleString(undefined, {maximumFractionDigits:0})} lbs/ac-depth 
        <br><small>Calculated using equation: (OM% x 10,000) × bulk density × (sample depth [cm] ÷ 10) × 0.893 (see image3).</small>`;
    }

    // Calculate soil organic carbon (SOC) in lbs/ac-depth and tonnes/acre for the plot
    let socLbsAcDepthStr = '';
    let socTonnesPerAcreStr = '';
    if (somLbsAcDepth !== null) {
      const socLbsAcDepth = calculateSoilOrganicCarbon(somLbsAcDepth);
      const socTonnesPerAcre = lbsPerAcreToTonnesPerAcre(socLbsAcDepth);
      socLbsAcDepthStr = `<b>Estimated Soil Organic Carbon (SOC):</b> ${socLbsAcDepth.toLocaleString(undefined, {maximumFractionDigits:0})} lbs/ac-depth<br>`;
      socTonnesPerAcreStr = `<b>Estimated SOC for Plot:</b> ${socTonnesPerAcre.toLocaleString(undefined, {maximumFractionDigits:2})} tonnes/acre`;
    }

    return `
      <b>Soil Texture Type:</b> ${soilType}<br>
      <b>Green Space Area:</b> ${soilArea} acres<br>
      <b>Soil Moisture:</b> ${soilMoisture}<br>
      <b>Munsell Soil Color:</b> Hue <b>${soilHue}</b>, Value <b>${soilValue}</b>, Chroma <b>${soilChroma}</b><br>
      <div style="margin-top:0.7em;">${somEstimate}</div>
      ${bulkDensityStr ? `<div style="margin-top:0.7em;">${bulkDensityStr}</div>` : ""}
      ${somLbsAcDepthStr ? `<div style="margin-top:0.7em;">${somLbsAcDepthStr}</div>` : ""}
      ${socLbsAcDepthStr ? `<div style="margin-top:0.7em;">${socLbsAcDepthStr}</div>` : ""}
      ${socTonnesPerAcreStr ? `<div style="margin-top:0.7em;">${socTonnesPerAcreStr}</div>` : ""}
    `;
  }

  // Display the summary
  document.getElementById('soilSummary').innerHTML = getSoilSummaryHTML(fieldData);

  // On submit, save all values to SOIL_KEY (including estimated SOM, SOC, and bulk density)
  soilForm.addEventListener('submit', function(e) {
    e.preventDefault();
    // Try to parse bulk density, SOM, and SOC from summary
    const summaryHTML = getSoilSummaryHTML(fieldData);
    let bulkDensity = null;
    const bdMatch = summaryHTML.match(/Estimated Bulk Density:<\/b> ([0-9.]+) g\/cm³/);
    if (bdMatch) bulkDensity = parseFloat(bdMatch[1]);
    let somLbsAcDepth = null;
    const somMatch = summaryHTML.match(/Estimated Soil Organic Matter \(SOM\):<\/b> ([0-9,]+) lbs\/ac-depth/);
    if (somMatch) somLbsAcDepth = parseFloat(somMatch[1].replace(/,/g, ''));
    let socLbsAcDepth = null;
    const socMatch = summaryHTML.match(/Estimated Soil Organic Carbon \(SOC\):<\/b> ([0-9,]+) lbs\/ac-depth/);
    if (socMatch) socLbsAcDepth = parseFloat(socMatch[1].replace(/,/g, ''));
    let socTonnesPerAcre = null;
    const socTonneMatch = summaryHTML.match(/Estimated SOC for Plot:<\/b> ([0-9.,]+) tonnes\/acre/);
    if (socTonneMatch) socTonnesPerAcre = parseFloat(socTonneMatch[1].replace(/,/g, ''));
    const data = {
      soilType: fieldData.soilType,
      soilArea: fieldData.totalArea,
      soilMoisture: fieldData.soilMoisture,
      soilHue: fieldData.soilHue,
      soilValue: fieldData.soilValue,
      soilChroma: fieldData.soilChroma,
      sampleDepthCm: fieldData.sampleDepthCm || 30,
      soilOrganicMatter: getSoilSummaryHTML(fieldData),
      bulkDensity,
      somLbsAcDepth,
      socLbsAcDepth,
      socTonnesPerAcre
    };
    saveData(SOIL_KEY, data);
    window.location.href = 'results.html';
  });
}

// ... rest of code unchanged ...