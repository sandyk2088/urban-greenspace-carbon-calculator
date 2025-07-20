// Shared state keys
const FIELD_KEY = 'ugcc_field';
const TREES_KEY = 'ugcc_trees';
const SOIL_KEY = 'ugcc_soil';

// Helper: save to localStorage
function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Helper: load from localStorage
function loadData(key, fallback) {
  const val = localStorage.getItem(key);
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

// ========== FIELD FORM ==========
const fieldForm = document.getElementById('fieldForm');
if (fieldForm) {
  // Row add/remove for tree species
  window.addRowField = function() {
    const tbody = document.getElementById('treeRowsField');
    const row = document.createElement('tr');
    row.className = 'input-row';
    row.innerHTML = `
      <td><input type="text" name="species" required></td>
      <td><input type="number" name="count" min="1" value="1" required></td>
      <td><input type="number" name="circumference" min="1" step="0.1" required></td>
    `;
    tbody.appendChild(row);
  };

  fieldForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
      fieldName: fieldForm.fieldName.value,
      location: fieldForm.location.value,
      totalArea: parseFloat(fieldForm.totalArea.value),
      soilType: fieldForm.soilType.value,
      soilMoisture: fieldForm.soilMoisture.value,
      soilHue: fieldForm.soilHue.value,
      soilValue: parseFloat(fieldForm.soilValue.value),
      soilChroma: parseFloat(fieldForm.soilChroma.value),
      trees: []
    };
    // Collect tree rows
    const rows = fieldForm.querySelectorAll('#treeRowsField tr');
    rows.forEach(row => {
      data.trees.push({
        species: row.querySelector('input[name="species"]').value,
        count: parseInt(row.querySelector('input[name="count"]').value) || 0,
        circumference: parseFloat(row.querySelector('input[name="circumference"]').value) || 0
      });
    });
    saveData(FIELD_KEY, data);
    window.location.href = 'tree.html';
  });
}

// ========== TREE FORM ==========
const treeForm = document.getElementById('treeForm');
if (treeForm) {
  // Populate tree rows from FIELD_KEY
  const fieldData = loadData(FIELD_KEY, {});
  const treesFromField = Array.isArray(fieldData.trees) ? fieldData.trees : [];
  const previousTrees = loadData(TREES_KEY, []);
  const tbody = document.getElementById('treeRows');
  tbody.innerHTML = ""; // Clear any existing

  treesFromField.forEach((tree, idx) => {
    const prev = previousTrees[idx] || {};
    const tr = document.createElement('tr');
    tr.className = 'input-row';
    tr.innerHTML = `
      <td><input type="text" name="species" value="${tree.species || ""}" readonly tabindex="-1"></td>
      <td><input type="number" name="count" value="${tree.count || 1}" readonly tabindex="-1"></td>
      <td><input type="number" name="circumference" value="${tree.circumference || ""}" readonly tabindex="-1"></td>
      <td><input type="number" name="seq" min="0" step="0.01" value="${prev.seq !== undefined ? prev.seq : ""}" required></td>
      <td><input type="number" name="stored" min="0" step="0.01" value="${prev.stored !== undefined ? prev.stored : ""}" required></td>
    `;
    tbody.appendChild(tr);
  });

  // Calculate and show totals
  function updateTreeTotals() {
    // Conversion factors
    const lbsToKg = 0.453592;
    const kgToTon = 0.001;
    let totalSeqKg = 0, totalStoKg = 0;
    const rows = treeForm.querySelectorAll('#treeRows tr');
    rows.forEach(row => {
      const count = parseInt(row.querySelector('input[name="count"]').value) || 0;
      const seq = parseFloat(row.querySelector('input[name="seq"]').value) || 0;
      const sto = parseFloat(row.querySelector('input[name="stored"]').value) || 0;
      totalSeqKg += seq * lbsToKg * count;
      totalStoKg += sto * lbsToKg * count;
    });
    const totalSeqTons = totalSeqKg * kgToTon;
    const totalStoTons = totalStoKg * kgToTon;
    let totalsDiv = document.getElementById('treeTotals');
    if (!totalsDiv) {
      totalsDiv = document.createElement('div');
      totalsDiv.id = 'treeTotals';
      totalsDiv.className = 'note';
      treeForm.appendChild(totalsDiv);
    }
    totalsDiv.innerHTML = `<b>Total for all trees:</b> 
      <br>Carbon Sequestered per Year: <b>${totalSeqKg.toLocaleString(undefined, {maximumFractionDigits:2})} kg</b> (${totalSeqTons.toLocaleString(undefined, {maximumFractionDigits:3})} t)
      <br>Carbon Stored: <b>${totalStoKg.toLocaleString(undefined, {maximumFractionDigits:2})} kg</b> (${totalStoTons.toLocaleString(undefined, {maximumFractionDigits:3})} t)`;
  }

  // Initial calculation
  updateTreeTotals();

  // Add event listeners to update totals when inputs change
  treeForm.addEventListener('input', function(e) {
    if (e.target && (e.target.name === 'seq' || e.target.name === 'stored')) {
      updateTreeTotals();
    }
  });

  treeForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const rows = treeForm.querySelectorAll('#treeRows tr');
    const trees = [];
    rows.forEach((row, i) => {
      const species = row.querySelector('input[name="species"]').value;
      const count = parseInt(row.querySelector('input[name="count"]').value) || 0;
      const circumference = parseFloat(row.querySelector('input[name="circumference"]').value) || 0;
      const seq = parseFloat(row.querySelector('input[name="seq"]').value) || 0;
      const stored = parseFloat(row.querySelector('input[name="stored"]').value) || 0;
      trees.push({
        species,
        count,
        circumference,
        seq,
        stored
      });
    });
    saveData(TREES_KEY, trees);
    window.location.href = 'soil.html';
  });
}

// ========== SOIL FORM ==========
const soilForm = document.getElementById('soilForm');
if (soilForm) {
  // Get values from field measurements page
  const FIELD_KEY = 'ugcc_field';
  const fieldData = loadData(FIELD_KEY, {});

  // Optionally also use previously calculated SOM estimate if available
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
    // Organic matter (estimate using the previous logic)
    // Map soilType to texture group
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

    return `
      <b>Soil Texture Type:</b> ${soilType}<br>
      <b>Green Space Area:</b> ${soilArea} acres<br>
      <b>Soil Moisture:</b> ${soilMoisture}<br>
      <b>Munsell Soil Color:</b> Hue <b>${soilHue}</b>, Value <b>${soilValue}</b>, Chroma <b>${soilChroma}</b><br>
      <div style="margin-top:0.7em;">${somEstimate}</div>
      <div class="note" style="margin-top:1em">
        <b>Organic Matter Content Table:</b><br>
        <img src="image1" alt="Estimation of organic matter content based on Munsell soil colour" style="max-width:100%;border:1px solid #aaa;">
        <br>
        <small>Source: Schlichting, Blume and Stahr, 1995.</small>
      </div>
    `;
  }

  // Display the summary
  document.getElementById('soilSummary').innerHTML = getSoilSummaryHTML(fieldData);

  // On submit, save all values to SOIL_KEY (including estimated SOM)
  soilForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
      soilType: fieldData.soilType,
      soilArea: fieldData.totalArea,
      soilMoisture: fieldData.soilMoisture,
      soilHue: fieldData.soilHue,
      soilValue: fieldData.soilValue,
      soilChroma: fieldData.soilChroma,
      soilOrganicMatter: getSoilSummaryHTML(fieldData)
    };
    saveData(SOIL_KEY, data);
    window.location.href = 'results.html';
  });
}

// ========== RESULTS ==========
const treeSummaryDiv = document.getElementById('treeSummary');
const soilSummaryDiv = document.getElementById('soilSummary');
const resultDiv = document.getElementById('result');
if (resultDiv) {
  // Conversion factors
  const lbsToKg = 0.453592;
  const kgToTon = 0.001;
  const acresToHectares = 0.404686;
  const cToCO2 = 44/12;

  // Soil sequestration rates (tC/ha/yr)
  const soilSequestrationRates = {
    'Sand': 0.18,
    'Loamy Sand': 0.22,
    'Sandy Loam': 0.24,
    'Loam': 0.4,
    'Silt Loam': 0.34,
    'Silt': 0.3,
    'Sandy Clay Loam': 0.28,
    'Clay Loam': 0.35,
    'Silty Clay Loam': 0.32,
    'Sandy Clay': 0.26,
    'Silty Clay': 0.32,
    'Clay': 0.3,
    'Other': 0.25
  };

  const field = loadData(FIELD_KEY, {});
  const trees = loadData(TREES_KEY, []);
  const soil = loadData(SOIL_KEY, {});

  // Tree Calculations
  let totalTreeSequesteredKg = 0, totalTreeStoredKg = 0;
  let treeOutput = `<h2>Tree Measurements Summary</h2><ul>`;
  trees.forEach(tree => {
    const seqKg = tree.seq * lbsToKg;
    const storedKg = tree.stored * lbsToKg;
    const totalSeq = seqKg * tree.count;
    const totalSto = storedKg * tree.count;
    totalTreeSequesteredKg += totalSeq;
    totalTreeStoredKg += totalSto;
    treeOutput += `<li><b>${tree.species}</b> — Count: ${tree.count}, Circumference: ${tree.circumference} in, C Sequestered: ${totalSeq.toFixed(2)} kg/yr (${(totalSeq*kgToTon).toFixed(3)} t/yr), C Stored: ${totalSto.toFixed(2)} kg (${(totalSto*kgToTon).toFixed(3)} t)</li>`;
  });
  treeOutput += `</ul>`;
  treeOutput += `<b>Total Carbon Sequestered by Trees:</b> ${totalTreeSequesteredKg.toLocaleString(undefined, {maximumFractionDigits:2})} kg/year (${(totalTreeSequesteredKg*kgToTon).toLocaleString(undefined, {maximumFractionDigits:3})} t/year)<br>`;
  treeOutput += `<b>Total Carbon Stored in Trees:</b> ${totalTreeStoredKg.toLocaleString(undefined, {maximumFractionDigits:2})} kg (${(totalTreeStoredKg*kgToTon).toLocaleString(undefined, {maximumFractionDigits:3})} t)`;

  if (treeSummaryDiv) treeSummaryDiv.innerHTML = treeOutput;

  // Soil Calculations
  const soilType = soil.soilType || field.soilType || 'Other';
  const soilAreaAcres = soil.soilArea || field.totalArea || 0;
  const soilMoisture = soil.soilMoisture || field.soilMoisture || '';
  const soilHue = soil.soilHue || field.soilHue || '';
  const soilValue = soil.soilValue || field.soilValue || '';
  const soilChroma = soil.soilChroma || field.soilChroma || '';
  const soilStoredPerHa = soil.soilStored || 0;
  const soilAreaHa = soilAreaAcres * acresToHectares;
  const totalSoilStored = soilAreaHa * soilStoredPerHa;
  const sequestrationRate = soilSequestrationRates[soilType] || soilSequestrationRates['Other'];
  const totalSoilSequestered = soilAreaHa * sequestrationRate;
  let soilOutput = `<h2>Soil Measurements Summary</h2>`;
  soilOutput += `<b>Soil Texture Type:</b> ${soilType}<br>`;
  soilOutput += `<b>Green Space Area:</b> ${soilAreaAcres.toLocaleString(undefined, {maximumFractionDigits:2})} acres (${soilAreaHa.toLocaleString(undefined, {maximumFractionDigits:2})} ha)<br>`;
  soilOutput += `<b>Soil Moisture:</b> ${soilMoisture}<br>`;
  soilOutput += `<b>Munsell Soil Color:</b> Hue <b>${soilHue}</b>, Value <b>${soilValue}</b>, Chroma <b>${soilChroma}</b><br>`;
  soilOutput += `<b>Soil Carbon Stored:</b> ${soilStoredPerHa.toLocaleString(undefined, {maximumFractionDigits:2})} t/ha<br>`;
  soilOutput += `<b>Total Soil Carbon Stored:</b> ${totalSoilStored.toLocaleString(undefined, {maximumFractionDigits:2})} t<br>`;
  soilOutput += `<b>Total Soil Carbon Sequestered (annual estimate):</b> ${totalSoilSequestered.toLocaleString(undefined, {maximumFractionDigits:2})} t/year`;

  if (soil.soilOrganicMatter) {
    soilOutput += `<div class="note" style="margin-top:0.7em;">${soil.soilOrganicMatter}</div>`;
  }

  if (soilSummaryDiv) soilSummaryDiv.innerHTML = soilOutput;

  // Totals and CO2 equivalents
  const totalCarbonStoredTon = totalTreeStoredKg * kgToTon + totalSoilStored;
  const totalCarbonSequesteredTon = totalTreeSequesteredKg * kgToTon + totalSoilSequestered;
  const totalCO2StoredTon = totalCarbonStoredTon * cToCO2;
  const totalCO2SequesteredTon = totalCarbonSequesteredTon * cToCO2;

  let summaryTable = `
    <h2>Combined Carbon Summary</h2>
    <table class="summary-table" border="1">
      <tr>
        <th></th>
        <th>Carbon (t)</th>
        <th>CO₂ Equivalent (t)</th>
      </tr>
      <tr>
        <td><b>Total Stored</b></td>
        <td>${totalCarbonStoredTon.toLocaleString(undefined, {maximumFractionDigits:3})}</td>
        <td>${totalCO2StoredTon.toLocaleString(undefined, {maximumFractionDigits:3})}</td>
      </tr>
      <tr>
        <td><b>Total Sequestered / yr</b></td>
        <td>${totalCarbonSequesteredTon.toLocaleString(undefined, {maximumFractionDigits:3})}</td>
        <td>${totalCO2SequesteredTon.toLocaleString(undefined, {maximumFractionDigits:3})}</td>
      </tr>
    </table>
    <div class="note" style="margin-top:0.6em;">
      <b>Note:</b> 1 tonne carbon (t C) = 3.67 tonnes CO₂ equivalent (t CO₂e)
    </div>
  `;

  // Field info
  let fieldInfo = '';
  if (field.fieldName || field.location || field.totalArea) {
    fieldInfo = `<div style="margin-bottom:1em;"><b>Site:</b> ${field.fieldName || ''} <b>Location:</b> ${field.location || ''} <b>Total Area:</b> ${field.totalArea || ''} acres</div>`;
  }

  resultDiv.innerHTML = fieldInfo + summaryTable;
}