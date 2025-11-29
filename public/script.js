let students = [];
let currentExpandedRow = null;
let currentExpandedExam = null;
let chartInstances = {};

const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: 'numeric' });

const subjectNames = {
  chem: 'CHEMISTRY',
  phy: 'PHYSICS',
  bio: 'BIOLOGY',
  math: 'MATHEMATICS'
};

// ============================================
// DYNAMIC EXAM ORDERING - AUTO-UPDATED FROM BACKEND
// ============================================

// ============================================
// SIMPLE EXAM ORDERING - FOLLOWS DATA ORDER
// ============================================
function generateExamOrderAdvanced() {
  // Exam order is already set from processJsonData
  // Just validate and update display
  
  if (examOrder.length === 0) {
    // Fallback if not set (shouldn't happen)
    const uniqueExams = [];
    const seenExams = new Set();
    students.forEach(student => {
      student.exams.forEach(exam => {
        if (exam.maxTotal > 0 && !seenExams.has(exam.exam)) {
          uniqueExams.push(exam.exam);
          seenExams.add(exam.exam);
        }
      });
    });
    examOrder = uniqueExams;
  }
  
  last3Exams = examOrder.slice(-3);
  
  console.log('✅ Exam order (from data):', {
    examOrder: examOrder,
    last3Exams: last3Exams,
    total: examOrder.length
  });
  
  updateLast3ExamsDisplay();
  return { examOrder, last3Exams };
}


// ============================================
// AUTO-UPDATE LAST 3 EXAMS DISPLAY (Pills & Brackets)
// ============================================

function updateLast3ExamsDisplay() {
    try {
        // Ensure last3Exams is up to date
        if (examOrder.length > 0) {
            last3Exams = examOrder.slice(-3);
        }
        
        if (last3Exams.length === 0) {
            console.warn('⚠️ No exams available for last3Exams display');
            return;
        }
        
        // Update the section header description (text in brackets)
        const sectionHeader = document.querySelector('#last3Rank .section-header .header-content h2');
        if (sectionHeader) {
            sectionHeader.innerHTML = `<i class="fas fa-calendar-alt"></i> Last 3 Exams Ranking`;
        }
        
        const sectionDescription = document.querySelector('#last3Rank .section-header .header-content p');
        if (sectionDescription) {
            const examsList = last3Exams.join(', ');
            sectionDescription.textContent = `Recent performance analysis (${examsList})`;
        }
        
        // Update the exam pills (visual badges)
        const pillsContainer = document.querySelector('#last3Rank .exam-pills');
        if (pillsContainer) {
            // Clear existing pills
            pillsContainer.innerHTML = '';
            
            // Create new pills for each exam
            last3Exams.forEach(exam => {
                const pill = document.createElement('span');
                pill.className = 'exam-pill';
                pill.textContent = exam;
                pillsContainer.appendChild(pill);
            });
        }
        
        console.log('✅ Last 3 Exams display updated:', {
            last3Exams: last3Exams,
            pillsUpdated: pillsContainer ? 'Yes' : 'No',
            textUpdated: sectionDescription ? 'Yes' : 'No'
        });
        
    } catch (error) {
        console.error('❌ Last 3 Exams display update error:', error);
    }
}

// Add this after the existing constants (after line 8)
async function fetchStudentData() {
    showLoading();
    try {
        console.log('🔄 Fetching data from API...');
        const response = await fetch('/api/students');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📦 API Response:', result);
        
        if (result.success && result.data) {
            console.log(`✅ Data received: ${result.count} records`);
            processJsonData(result.data);  // ✅ Pass the data here
        } else {
            throw new Error('Invalid data format from API');
        }
    } catch (error) {
        console.error('❌ Fetch Error:', error);
        showStatus(`Error: ${error.message}`, 'error');
        
        // Show error message on page
        setTimeout(() => {
            const container = document.querySelector('.container') || document.body;
            container.innerHTML += `
                <div style="background: #ffebee; border: 2px solid #f44336; padding: 20px; margin: 20px; border-radius: 8px; text-align: center;">
                    <h3 style="color: #c62828;">⚠️ Data Loading Failed</h3>
                    <p style="color: #d32f2f;">${error.message}</p>
                    <p><strong>Troubleshooting:</strong></p>
                    <ul style="text-align: left; display: inline-block;">
                        <li>Check if backend server is running on port 3001</li>
                        <li>Run: <code>npm run dev</code></li>
                        <li>Check CSV file path: <code>data/data.csv</code></li>
                        <li>Open browser DevTools (F12) for detailed errors</li>
                    </ul>
                </div>
            `;
            
            // Fallback: Set empty students to unblock UI
            students = [];
            processJsonData([]);  // Trigger empty data processing
        }, 500);
    } finally {
        hideLoading();
    }
}

// Main initialization
window.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Page loaded, fetching data...');
    
    // Fetch data from backend
    fetchStudentData();
    
    // Initialize theme
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        setTimeout(() => themeToggleBtn.click(), 1);
        setTimeout(() => {
            const loading = document.getElementById('loadingOverlay');
            if (loading) loading.style.display = 'none';
        }, 1);
    }
});


// NEW: Filter functions
function filterOverallRanklist(filterType) {
    currentOverallFilter = filterType;

    // Update button states
    document.getElementById('overallAllBtn').classList.toggle('active', filterType === 'all');
    document.getElementById('overallRTBtn').classList.toggle('active', filterType === 'RT');
    document.getElementById('overallWEBtn').classList.toggle('active', filterType === 'WE');
    document.getElementById('overallMTBtn').classList.toggle('active', filterType === 'MT');

    // Repopulate the overall ranklist with filtered data
    populateOverallFiltered(filterType);
}

function filterLast3Ranklist(filterType) {
    currentLast3Filter = filterType;

    // Update button states
    document.getElementById('last3AllBtn').classList.toggle('active', filterType === 'all');
    document.getElementById('last3RTBtn').classList.toggle('active', filterType === 'RT');
    document.getElementById('last3WEBtn').classList.toggle('active', filterType === 'WE');
    document.getElementById('last3MTBtn').classList.toggle('active', filterType === 'MT');

    // Repopulate the last 3 ranklist with filtered data
    populateLast3Filtered(filterType);
}

function getFilteredExamsForOverall(filterType) {
    if (filterType === 'all') {
        return examOrder; // All exams
    } else if (filterType === 'RT') {
        return examOrder.filter(exam => exam.startsWith('RT')); // Only RT exams
    } else if (filterType === 'WE') {
        return examOrder.filter(exam => exam.startsWith('WE')); // Only WE exams
    } else if (filterType === 'MT') {
        return examOrder.filter(exam => exam.startsWith('MT')); // Only MT exams
    }
    return examOrder;
}

function getFilteredExamsForLast3(filterType) {
    if (filterType === 'all') {
        return last3Exams; // WE 6, RT 2, WE 7
    } else if (filterType === 'RT') {
        // Get last 3 RT exams - but only RT 1 and RT 2 exist
        const rtExams = examOrder.filter(exam => exam.startsWith('RT'));
        return rtExams; // Will return ['RT 1', 'RT 2'] - all available RTs
    } else if (filterType === 'WE') {
        // Get last 3 WE exams - WE 5, WE 6, WE 7
        const weExams = examOrder.filter(exam => exam.startsWith('WE'));
        return weExams.slice(-3); // Last 3 WEs: ['WE 5', 'WE 6', 'WE 7']
    } else if (filterType === 'MT') {
        // Get last 3 MT exams - MT 5, MT 6, MT 7
        const mtExams = examOrder.filter(exam => exam.startsWith('MT'));  // ✅ FIXED: Added mtExams
        return mtExams.slice(-3); // Last 3 MTs: ['MT 5', 'MT 6', 'MT 7']
    }
    return last3Exams;
}

function populateOverallFiltered(filterType) {
    const tbody = document.querySelector('#rankTable tbody');
    tbody.innerHTML = '';

    const filteredExams = getFilteredExamsForOverall(filterType);

    // Calculate cumulative totals based on filtered exams
const filteredStudents = students.map(stu => {
  let cumTotal = 0;
  let cumMax = 0;
  let examsAttempted = 0;

  stu.exams.forEach(ex => {
    if (ex.maxTotal > 0 && filteredExams.includes(ex.exam)) {
      cumTotal += ex.total;
      cumMax += ex.maxTotal;
      examsAttempted++;
    }
  });

  const cumPercent = cumMax > 0 ? ((cumTotal / cumMax) * 100).toFixed(2) : "0.00";

  return {
    ...stu,
    filteredCumTotal: cumTotal,
    filteredCumMax: cumMax,
    filteredCumPercent: cumPercent,
    filteredExamsAttempted: examsAttempted
  };
});


    // Sort by filtered cumulative total
    const sorted = [...filteredStudents].sort((a, b) => {
        if (b.filteredCumTotal !== a.filteredCumTotal) {
            return b.filteredCumTotal - a.filteredCumTotal;
        }
        return a.roll.localeCompare(b.roll);
    });

    sorted.forEach((stu, i) => {
        const rank = stu.filteredCumTotal > 0 ? i + 1 : '-';
        const tr = document.createElement('tr');

        if (rank <= 3 && rank !== '-' && stu.filteredCumTotal > 0) {
            tr.classList.add('top-performer');
        }

        tr.innerHTML = `
            <td>${rank}</td>
            <td>${stu.roll}</td>
            <td class="name" data-roll="${stu.roll}">${stu.name}</td>
            <td>${stu.filteredExamsAttempted}</td>
            <td>${stu.filteredCumTotal}</td>
            <td>${stu.filteredCumPercent}%</td>
        `;

        tbody.appendChild(tr);
    });

    if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No students to display</td></tr>';
    document.getElementById('overallCount').textContent = '0 students';
    return;
    }
    document.getElementById('overallCount').textContent = `${students.length} students`;
    addClickListeners();
}

function populateLast3Filtered(filterType) {
    const tbody = document.querySelector('#last3Table tbody');
    tbody.innerHTML = '';

    const filteredExams = getFilteredExamsForLast3(filterType);

    // Calculate last 3 totals based on filtered exams
    const last3Students = students.map(stu => {
        let total = 0;
        let maxTotal = 0;
        let examsAttempted = 0;

        filteredExams.forEach(examName => {
            const examData = stu.exams.find(ex => ex.exam === examName && ex.maxTotal > 0);
            if (examData) {
                total += examData.total;
                maxTotal += examData.maxTotal;
                examsAttempted++;
            }
        });

        const last3Percent = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(2) : '0.00';

        return {
            ...stu,
            last3Total: total,
            last3Percent: last3Percent,
            last3ExamsAttempted: examsAttempted,
            last3MaxTotal: maxTotal
        };
    });

    // Sort by last 3 total
    const sorted = last3Students.sort((a, b) => {
        if (b.last3Total !== a.last3Total) {
            return b.last3Total - a.last3Total;
        }
        return a.roll.localeCompare(b.roll);
    });

    sorted.forEach((stu, i) => {
        const rank = stu.last3Total > 0 ? i + 1 : '-';
        const tr = document.createElement('tr');

        if (rank <= 3 && rank !== '-') {
            tr.classList.add('top-performer');
        }

        tr.innerHTML = `
            <td>${rank}</td>
            <td>${stu.roll}</td>
            <td class="name" data-roll="${stu.roll}">${stu.name}</td>
            <td>${stu.last3ExamsAttempted}</td>
            <td>${stu.last3Total}</td>
            <td>${stu.last3Percent}%</td>
        `;

        tbody.appendChild(tr);
    });

    if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No students to display</td></tr>';
    document.getElementById('overallCount').textContent = '0 students';
    return;
    }
    document.getElementById('last3Count').textContent = `${students.length} students`;
    addClickListeners();
}

// Utility functions
function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function showStatus(message, type) {
  const statusEl = document.getElementById('dataStatus');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  statusEl.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);
  }
}

// Main initialization (consolidated - replace all DOMContentLoaded listeners)
window.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Page loaded, fetching data...');
    
    // Fetch data from backend
    fetchStudentData();
    
    // Initialize theme
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        setTimeout(() => themeToggleBtn.click(), 1);
        setTimeout(() => {
            const loading = document.getElementById('loadingOverlay');
            if (loading) loading.style.display = 'none';
        }, 1);
    }
    
    // Initialize footer/stats after a delay
    setTimeout(() => {
        updateFooterStats();
        updateHeaderAndFooterStats();
    }, 500);
});

// Track exam order from data (first appearance order)
const examOrderFromData = [];
const seenExams = new Set();

function processJsonData(data) {
  showLoading();
  try {
    const studentMap = {};
    examOrderFromData.length = 0;  // Reset
    seenExams.clear();
    
    data.forEach(row => {
      const roll = row.roll.trim();
      const name = row.name.trim();
      const examName = row.exam.trim();
      
      // Track exam order as it appears in data
      if (!seenExams.has(examName) && row.maxTotal > 0) {
        examOrderFromData.push(examName);
        seenExams.add(examName);
      }
      
      if (!studentMap[roll]) {
        studentMap[roll] = {roll, name, exams: []};
      } else {
        studentMap[roll].name = name;
      }
      
      studentMap[roll].exams.push({
        exam: examName,
        scores: {
          chem: parseFloat(row.chem) || 0,
          phy: parseFloat(row.phy) || 0,
          bio: parseFloat(row.bio) || 0,
          math: parseFloat(row.math) || 0
        },
        maxScores: {
          chem: parseFloat(row.maxChem) || 0,
          phy: parseFloat(row.maxPhy) || 0,
          bio: parseFloat(row.maxBio) || 0,
          math: parseFloat(row.maxMath) || 0
        },
        total: parseFloat(row.total) || 0,
        percent: parseFloat(row.percent) || 0,
        maxTotal: parseFloat(row.maxTotal) || 0
      });
    });
    
    students = Object.values(studentMap);
    students.forEach(computeCumulatives);
    
    // Use the data-based exam order
    examOrder = [...examOrderFromData];
    last3Exams = examOrder.slice(-3);
    
    updateLast3ExamsDisplay();
    console.log(`✅ Processed ${students.length} students`);

    // Handle empty data gracefully
    if (students.length === 0) {
      console.warn('⚠️ No student data available');
      // Populate empty tables with no-data message
      const tbody = document.querySelector('#rankTable tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No data available. Check CSV file.</td></tr>';
      document.getElementById('overallCount').textContent = '0 students';
      
      // Similar for other tables (add if needed)
      const last3Tbody = document.querySelector('#last3Table tbody');
      if (last3Tbody) last3Tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No data available.</td></tr>';
      document.getElementById('last3Count').textContent = '0 students';
      
      showStatus('⚠️ No data found - check CSV file', 'error');
      return;  // Early exit
    }

    // Populate all tables
    populateOverall();
    populateLast3();
    ['chem', 'phy', 'bio', 'math'].forEach(sub => populateSubject(`${sub}Table`, sub));
    populateStats();

    showTab('overall');

  } catch (error) {
    showStatus(`Error processing data: ${error.message}`, 'error');
    console.error('Data processing error:', error);
  } finally {
    hideLoading();
  }

  updateFooterStats();
  updateHeaderAndFooterStats();
  showStatus('✅ All data loaded and processed!', 'success');  // ✅ Consolidated: Only once
}

// Compute cumulatives for a student (percentages, strong/weak subjects)
function computeCumulatives(student) {
  let cumObt = 0;
  let cumMax = 0;
  let subjectTotals = { chem: 0, phy: 0, bio: 0, math: 0 };
  let subjectMaxTotals = { chem: 0, phy: 0, bio: 0, math: 0 };

  student.exams.forEach(ex => {
    if (ex.maxTotal > 0) {
      cumObt += ex.total;
      cumMax += ex.maxTotal;
      for (let sub in ex.scores) {
        subjectTotals[sub] += ex.scores[sub];
        subjectMaxTotals[sub] += ex.maxScores[sub] || 0;
      }
    }
  });

  student.cumTotal = cumObt;
  student.cumMax = cumMax;
  student.cumPercent = cumMax > 0 ? (cumObt / cumMax * 100).toFixed(2) : 0;
  student.subjectTotals = subjectTotals;
  student.subjectMaxTotals = subjectMaxTotals;
  student.examsAttempted = student.exams.filter(ex => ex.maxTotal > 0).length;

  // Average percentage per subject
  const averages = {};
  for (let sub in subjectTotals) {
    averages[sub] = subjectMaxTotals[sub] > 0 ? ((subjectTotals[sub] / subjectMaxTotals[sub]) * 100).toFixed(2) : 0;
  }
  student.subjectAverages = averages;

  // Determine strong/weak subjects
  const subjects = ['chem', 'phy', 'bio', 'math'];
  if (student.examsAttempted > 0) {
    let maxAvg = -Infinity, minAvg = Infinity;
    let strongSubjects = [], weakSubjects = [];

    subjects.forEach(sub => {
      const avg = parseFloat(averages[sub]);
      if (avg > maxAvg) {
        maxAvg = avg;
        strongSubjects = [sub];
      } else if (avg === maxAvg) {
        strongSubjects.push(sub);
      }

      if (avg < minAvg) {
        minAvg = avg;
        weakSubjects = [sub];
      } else if (avg === minAvg) {
        weakSubjects.push(sub);
      }
    });

    student.strongSubject = strongSubjects.length > 0 ? strongSubjects : ['N/A'];
    student.weakSubject = weakSubjects.length > 0 ? weakSubjects : ['N/A'];
  } else {
    student.strongSubject = ['N/A'];
    student.weakSubject = ['N/A'];
  }
}

// Populate overall ranklist
function populateOverall() {
  const tbody = document.querySelector('#rankTable tbody');
  tbody.innerHTML = '';

  const sorted = [...students].sort((a, b) => b.cumTotal - a.cumTotal || a.roll.localeCompare(b.roll));

  sorted.forEach((stu, i) => {
    const rank = stu.cumTotal > 0 ? i + 1 : '-';
    const tr = document.createElement('tr');

    if (rank >= 1 && rank <= 3 && stu.cumTotal > 0) {
      tr.classList.add('top-performer');
    }

    tr.innerHTML = `
    <td>${rank}</td>
    <td>${stu.roll}</td>
    <td class="name" data-roll="${stu.roll}">${stu.name}</td>
    <td>${stu.examsAttempted}</td>
    <td>${stu.cumTotal}</td>
    <td>${stu.cumPercent}%</td>
    `;

    tbody.appendChild(tr);
  });
  
  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No students to display</td></tr>';
    document.getElementById('overallCount').textContent = '0 students';
    return;
  }
  document.getElementById('overallCount').textContent = `${students.length} students`;
  addClickListeners();
}

// Populate subject ranklist
function populateSubject(tableId, sub) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  tbody.innerHTML = '';

  const sorted = [...students]
  .filter(s => s.subjectMaxTotals[sub] > 0)
  .sort((a, b) => {
    const totalB = b.subjectTotals[sub] || 0;
    const totalA = a.subjectTotals[sub] || 0;
    return totalB - totalA || a.roll.localeCompare(b.roll);
  });

  sorted.forEach((stu, i) => {
    const rank = i + 1;
    const tr = document.createElement('tr');

    if (rank >= 1 && rank <= 3) {
      tr.classList.add('top-performer');
    }

    const avgPercent = stu.subjectAverages[sub];

    tr.innerHTML = `
    <td>${rank}</td>
    <td>${stu.roll}</td>
    <td>${stu.name}</td>
    <td>${stu.examsAttempted}</td>
    <td>${stu.subjectTotals[sub]}</td>
    <td>${avgPercent}%</td>
    `;

    tbody.appendChild(tr);
  });
}

// Populate overall stats and details tables
function populateStats() {
  // Total exams and students
  const allExams = [...new Set(students.flatMap(stu => stu.exams.filter(ex => ex.maxTotal > 0).map(ex => ex.exam)))];
  const totalExams = allExams.length;
  const totalStudents = students.length;

  document.querySelector('#totalExams').textContent = totalExams;
  document.querySelector('#totalStudents').textContent = totalStudents;

// Overall average — cohort totals over cohort maxima
let overallObtained = 0;
let overallMax = 0;
students.forEach(stu => {
  overallObtained += (parseFloat(stu.cumTotal) || 0);
  overallMax += (parseFloat(stu.cumMax) || 0);
});
const overallAvg = overallMax > 0 ? ((overallObtained / overallMax) * 100).toFixed(2) : "0.00";
document.querySelector('#avgScore').textContent = `${overallAvg}%`;


  // Class average % per subject — sum of totals / sum of maxima
const subjectKeys = ['chem', 'phy', 'bio', 'math'];
const subjectTotals = { chem: 0, phy: 0, bio: 0, math: 0 };
const subjectMaxTotals = { chem: 0, phy: 0, bio: 0, math: 0 };

students.forEach(stu => {
  subjectKeys.forEach(sub => {
    subjectTotals[sub] += (parseFloat(stu.subjectTotals?.[sub]) || 0);
    subjectMaxTotals[sub] += (parseFloat(stu.subjectMaxTotals?.[sub]) || 0);
  });
});

const subjectAverages = {};
let mostDifficult = 'N/A';
let minAvg = Infinity;

subjectKeys.forEach(sub => {
  const pct = subjectMaxTotals[sub] > 0 ? ((subjectTotals[sub] / subjectMaxTotals[sub]) * 100) : 0;
  subjectAverages[sub] = pct.toFixed(2);
  if (pct > 0 && pct < minAvg) {
    minAvg = pct;
    mostDifficult = subjectNames[sub];
  }
});

// Populate subject difficulty table (unchanged rendering logic)
const subjectTbody = document.querySelector('#subjectDifficultyDetails tbody');
subjectTbody.innerHTML = '';

subjectKeys.forEach(sub => {
  const tr = document.createElement('tr');
  const avg = parseFloat(subjectAverages[sub]);
  let status = '';
  let statusClass = '';

  if (avg >= 70) {
    status = 'Easy';
    statusClass = 'improved';
  } else if (avg >= 50) {
    status = 'Moderate';
  } else if (avg > 0) {
    status = 'Difficult';
    statusClass = 'declined';
  } else {
    status = 'No Data';
  }

  tr.innerHTML = `
    <td>${subjectNames[sub]}</td>
    <td>${subjectAverages[sub]}%</td>
    <td class="${statusClass}">${status}</td>
  `;
  subjectTbody.appendChild(tr);
});

// Add most difficult subject row
const mostTr = document.createElement('tr');
mostTr.innerHTML = `
  <td><strong>MOST DIFFICULT</strong></td>
  <td colspan="2" class="declined"><strong>${mostDifficult}</strong></td>
`;
subjectTbody.appendChild(mostTr);

  // Populate exam participation table
  const examTbody = document.querySelector('#examDetails tbody');
  examTbody.innerHTML = '';

  examOrder.forEach(exam => {
    const attempted = students.filter(stu => stu.exams.some(ex => ex.exam === exam && ex.maxTotal > 0)).length;
    const participationRate = totalStudents > 0 ? ((attempted / totalStudents) * 100).toFixed(1) : 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
    <td class="exam-name" data-exam="${exam}">${exam}</td>
    <td>${attempted}</td>
    <td>${participationRate}%</td>
    `;
    examTbody.appendChild(tr);
  });

  // Populate student details table
  const studentTbody = document.querySelector('#studentDetails tbody');
  studentTbody.innerHTML = '';

  const sortedStudents = [...students].sort((a, b) => a.roll.localeCompare(b.roll));

  sortedStudents.forEach((stu, i) => {
    const strongLabel = stu.strongSubject[0] === 'N/A' ? 'N/A' :
    stu.strongSubject.map(sub => `${subjectNames[sub]} (${stu.subjectAverages[sub]}%)`).join(', ');

    const weakLabel = stu.weakSubject[0] === 'N/A' ? 'N/A' :
    stu.weakSubject.map(sub => `${subjectNames[sub]} (${stu.subjectAverages[sub]}%)`).join(', ');

    const tr = document.createElement('tr');
    tr.innerHTML = `
    <td>${i + 1}</td>
    <td>${stu.roll}</td>
    <td class="name" data-roll="${stu.roll}">${stu.name}</td>
    <td class="improved">${strongLabel}</td>
    <td class="declined">${weakLabel}</td>
    `;
    studentTbody.appendChild(tr);
  });

  addClickListeners();
}

// Add click listeners for names and exams
function addClickListeners() {
  document.querySelectorAll('.name').forEach(name => {
    name.removeEventListener('click', handleNameClick);
    name.addEventListener('click', handleNameClick);
  });

  document.querySelectorAll('.exam-name').forEach(name => {
    name.removeEventListener('click', handleExamClick);
    name.addEventListener('click', handleExamClick);
  });
}

// Handle student name click (toggle details)
function handleNameClick(event) {
  const roll = event.target.dataset.roll;
  const stu = students.find(s => s.roll === roll);
  const tr = event.target.parentNode;

  // Close any existing expanded row
  if (currentExpandedRow && currentExpandedRow !== tr.nextElementSibling) {
    currentExpandedRow.remove();
    currentExpandedRow = null;
  }

  let next = tr.nextElementSibling;
  if (next && next.classList.contains('details-row')) {
    next.remove();
    currentExpandedRow = null;
    return;
  }

  // Create new details row
  const detailsTr = document.createElement('tr');
  detailsTr.classList.add('details-row');

  const td = document.createElement('td');
  td.colSpan = tr.children.length;

  const div = document.createElement('div');
  div.classList.add('details');

  // Build student details content
  let content = buildStudentDetailsContent(stu);

  div.innerHTML = content;
  td.appendChild(div);
  detailsTr.appendChild(td);
  tr.after(detailsTr);
  currentExpandedRow = detailsTr;

  // Add chart functionality
  createChart(stu, `chart-${stu.roll}`, 'total');

  const toggleBtn = document.getElementById(`chartToggle-${stu.roll}`);
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      const mode = this.textContent.includes('SUBJECT-WISE') ? 'subjects' : 'total';
      this.textContent = mode === 'total' ? 'SHOW SUBJECT-WISE %' : 'SHOW TOTAL %';
      createChart(stu, `chart-${stu.roll}`, mode);
    });
  }
}

// Build student details content
function buildStudentDetailsContent(stu) {
  const overallRank = stu.cumTotal > 0 ?
  [...students].sort((a, b) => b.cumTotal - a.cumTotal || a.roll.localeCompare(b.roll))
  .findIndex(s => s.roll === stu.roll) + 1 : 'N/A';

  let content = `
  <div class="student-details-header">
  <h3>${stu.name} (ROLL: ${stu.roll})</h3>
  <div class="student-summary">
  <p><strong>Overall Rank:</strong> ${overallRank}</p>
  <p><strong>Total Score:</strong> ${stu.cumTotal}</p>
  <p><strong>Percentage:</strong> ${stu.cumPercent}%</p>
  <p><strong>Exams Attempted:</strong> ${stu.examsAttempted}</p>
  </div>
  </div>
  `;

  // Strong/weak subjects
  const strongLabel = stu.strongSubject[0] === 'N/A' ? 'N/A' :
  stu.strongSubject.map(sub => `${subjectNames[sub]} (${stu.subjectAverages[sub]}%)`).join(', ');

  const weakLabel = stu.weakSubject[0] === 'N/A' ? 'N/A' :
  stu.weakSubject.map(sub => `${subjectNames[sub]} (${stu.subjectAverages[sub]}%)`).join(', ');

  content += `
  <div class="subject-strengths">
  <p><strong>STRONGEST SUBJECT:</strong> <span class="improved">${strongLabel}</span></p>
  <p><strong>WEAKEST SUBJECT:</strong> <span class="declined">${weakLabel}</span></p>
  </div>
  `;

  // Subject ranks
  if (stu.examsAttempted > 0) {
    const { ranks } = getSubjectRanks(stu);
    content += `
    <h4>SUBJECT-WISE RANKS</h4>
    <table class="subject-rank-table">
    <thead>
    <tr>
    <th>SUBJECT</th>
    <th>RANK</th>
    <th>TOTAL SCORE</th>
    <th>AVG %</th>
    </tr>
    </thead>
    <tbody>
    `;

    ['chem', 'bio', 'math', 'phy'].forEach(sub => {
      const avgPct = stu.subjectAverages[sub];
      const rowClass = stu.strongSubject.includes(sub) ? 'improved' :
      stu.weakSubject.includes(sub) ? 'declined' : '';

      content += `
      <tr class="${rowClass}">
      <td>${subjectNames[sub]}</td>
      <td>${ranks[sub].rank}</td>
      <td>${ranks[sub].total}</td>
      <td>${avgPct}%</td>
      </tr>
      `;
    });

    content += '</tbody></table>';
  }

  // Previous marks
  const validExams = stu.exams.filter(ex => ex.maxTotal > 0);
  if (validExams.length > 0) {
    content += `
    <h4>ALL PREVIOUS MARKS</h4>
    <table class="previous-table">
    <thead>
    <tr>
    <th>EXAM</th>
    <th>RANK</th>
    <th>CHEM (raw | %)</th>
    <th>PHY (raw | %)</th>
    <th>BIO (raw | %)</th>
    <th>MATH (raw | %)</th>
    <th>TOTAL</th>
    <th>%</th>
    </tr>
    </thead>
    <tbody>
    `;

    validExams.forEach(ex => {
      const rank = getExamRank(stu, ex.exam);

      // Show "-" for subjects that have maxScore = 0, otherwise show score and percentage
      const chemDisplay = ex.maxScores.chem > 0 ? `${ex.scores.chem} | ${(ex.scores.chem / ex.maxScores.chem * 100).toFixed(2)}%` : '-';
      const phyDisplay = ex.maxScores.phy > 0 ? `${ex.scores.phy} | ${(ex.scores.phy / ex.maxScores.phy * 100).toFixed(2)}%` : '-';
      const bioDisplay = ex.maxScores.bio > 0 ? `${ex.scores.bio} | ${(ex.scores.bio / ex.maxScores.bio * 100).toFixed(2)}%` : '-';
      const mathDisplay = ex.maxScores.math > 0 ? `${ex.scores.math} | ${(ex.scores.math / ex.maxScores.math * 100).toFixed(2)}%` : '-';

      content += `
      <tr>
      <td>${ex.exam}</td>
      <td>${rank}</td>
      <td>${chemDisplay}</td>
      <td>${phyDisplay}</td>
      <td>${bioDisplay}</td>
      <td>${mathDisplay}</td>
      <td>${ex.total}</td>
      <td>${(ex.total / ex.maxTotal * 100).toFixed(2)}%</td>
      </tr>
      `;
    });

    content += '</tbody></table>';
  }

  // Progress tracking
  const progress = computeProgress(stu);
  if (progress.length > 0) {
    content += `
    <h4>PROGRESS TRACKING</h4>
    <table class="progress-table">
    <thead>
    <tr>
    <th>EXAM</th>
    <th>RANK</th>
    <th>RANK CHANGE</th>
    <th>TOTAL SCORE</th>
    <th>SCORE CHANGE</th>
    </tr>
    </thead>
    <tbody>
    `;

    progress.forEach(p => {
      const rankChangeText = p.rankChange > 0 ? `+${p.rankChange} (Improved)` :
      p.rankChange < 0 ? `${p.rankChange} (Declined)` : 'No Change';
      const scoreChangeText = p.scoreChange > 0 ? `+${p.scoreChange} (Improved)` :
      p.scoreChange < 0 ? `${p.scoreChange} (Declined)` : 'No Change';

      const rankClass = p.rankChange > 0 ? 'improved' : p.rankChange < 0 ? 'declined' : '';
      const scoreClass = p.scoreChange > 0 ? 'improved' : p.scoreChange < 0 ? 'declined' : '';

      content += `
      <tr>
      <td>${p.exam}</td>
      <td>${p.rank}</td>
      <td class="${rankClass}">${rankChangeText}</td>
      <td>${p.score}</td>
      <td class="${scoreClass}">${scoreChangeText}</td>
      </tr>
      `;
    });

    content += '</tbody></table>';
  }

  // Chart
  content += `
  <h4>EXAM MARKS LINE CHART</h4>
  <div class="chart-container">
  <button id="chartToggle-${stu.roll}">SHOW SUBJECT-WISE %</button>
  <canvas id="chart-${stu.roll}"></canvas>
  </div>
  `;

  return content;
}

// Handle exam click (toggle ranklist)
function handleExamClick(event) {
  const exam = event.target.dataset.exam;
  const tr = event.target.parentNode;

  if (currentExpandedExam && currentExpandedExam !== tr.nextElementSibling) {
    currentExpandedExam.remove();
    currentExpandedExam = null;
  }

  let next = tr.nextElementSibling;
  if (next && next.classList.contains('exam-details-row')) {
    next.remove();
    currentExpandedExam = null;
    return;
  }

  const detailsTr = document.createElement('tr');
  detailsTr.classList.add('exam-details-row');

  const td = document.createElement('td');
  td.colSpan = tr.children.length;

  const div = document.createElement('div');
  div.classList.add('details');

  // Build exam ranklist
  const examStudents = students
  .filter(stu => stu.exams.some(ex => ex.exam === exam && ex.maxTotal > 0))
  .map(stu => {
    const examData = stu.exams.find(ex => ex.exam === exam);
    return {
      ...stu,
      examTotal: examData.total,
      examPercent: (examData.total / examData.maxTotal * 100).toFixed(2),
      examData
    };
  })
  .sort((a, b) => b.examTotal - a.examTotal || a.roll.localeCompare(b.roll));

  let content = `
  <h3>RANKLIST FOR ${exam}</h3>
  <table class="exam-ranklist">
  <thead>
  <tr>
  <th>RANK</th>
  <th>ROLL NO</th>
  <th>NAME</th>
  <th>CHEM (raw | %)</th>
  <th>PHY (raw | %)</th>
  <th>BIO (raw | %)</th>
  <th>MATH (raw | %)</th>
  <th>TOTAL</th>
  <th>%</th>
  </tr>
  </thead>
  <tbody>
  `;

  examStudents.forEach((stu, i) => {
    const rank = stu.examTotal > 0 ? i + 1 : '-';
    const ex = stu.examData;

    // Show "-" for subjects that have maxScore = 0, otherwise show score and percentage
    const chemDisplay = ex.maxScores.chem > 0 ? `${ex.scores.chem} | ${(ex.scores.chem / ex.maxScores.chem * 100).toFixed(2)}%` : '-';
    const phyDisplay = ex.maxScores.phy > 0 ? `${ex.scores.phy} | ${(ex.scores.phy / ex.maxScores.phy * 100).toFixed(2)}%` : '-';
    const bioDisplay = ex.maxScores.bio > 0 ? `${ex.scores.bio} | ${(ex.scores.bio / ex.maxScores.bio * 100).toFixed(2)}%` : '-';
    const mathDisplay = ex.maxScores.math > 0 ? `${ex.scores.math} | ${(ex.scores.math / ex.maxScores.math * 100).toFixed(2)}%` : '-';

    const rowClass = rank <= 3 && rank !== '-' ? ' class="top-performer"' : '';

    content += `
    <tr${rowClass}>
    <td>${rank}</td>
    <td>${stu.roll}</td>
    <td>${stu.name}</td>
    <td>${chemDisplay}</td>
    <td>${phyDisplay}</td>
    <td>${bioDisplay}</td>
    <td>${mathDisplay}</td>
    <td>${stu.examTotal}</td>
    <td>${stu.examPercent}%</td>
    </tr>
    `;
  });

  content += '</tbody></table>';

  div.innerHTML = content;
  td.appendChild(div);
  detailsTr.appendChild(td);
  tr.after(detailsTr);
  currentExpandedExam = detailsTr;
}

// Helper functions
function computeProgress(student) {
  const validExams = student.exams.filter(ex => ex.maxTotal > 0);
  const progress = [];

  if (validExams.length < 2) return progress;

  for (let i = 1; i < validExams.length; i++) {
    const exam = validExams[i];
    const prevExam = validExams[i - 1];

    const currRank = getExamRank(student, exam.exam);
    const prevRank = getExamRank(student, prevExam.exam);
    const rankChange = prevRank - currRank;
    const scoreChange = exam.total - prevExam.total;

    progress.push({
      exam: exam.exam,
      rank: currRank,
      rankChange,
      score: exam.total,
      scoreChange
    });
  }

  return progress;
}

function getExamRank(student, examName) {
  const examStudents = students
  .filter(stu => stu.exams.some(ex => ex.exam === examName && ex.maxTotal > 0))
  .map(stu => ({ ...stu, examTotal: stu.exams.find(ex => ex.exam === examName).total }))
  .sort((a, b) => b.examTotal - a.examTotal || a.roll.localeCompare(b.roll));

  return examStudents.findIndex(s => s.roll === student.roll) + 1;
}

function getSubjectRanks(student) {
  const ranks = {};

  ['chem', 'phy', 'bio', 'math'].forEach(sub => {
    const sorted = [...students]
    .filter(s => s.subjectMaxTotals[sub] > 0)
    .sort((a, b) => {
      const percB = b.subjectMaxTotals[sub] > 0 ? (b.subjectTotals[sub] / b.subjectMaxTotals[sub]) * 100 : 0;
      const percA = a.subjectMaxTotals[sub] > 0 ? (a.subjectTotals[sub] / a.subjectMaxTotals[sub]) * 100 : 0;
      return percB - percA || a.roll.localeCompare(b.roll);
    });

    ranks[sub] = {
      rank: student.subjectMaxTotals[sub] > 0 ? sorted.findIndex(s => s.roll === student.roll) + 1 : '-',
      total: student.subjectTotals[sub]
    };
  });

  return { ranks };
}

// Create chart
function createChart(stu, canvasId, mode) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const ctx = document.getElementById(canvasId).getContext('2d');
  const validExams = stu.exams.filter(ex => ex.maxTotal > 0);
  const labels = validExams.map(ex => ex.exam);
  let datasets = [];

  if (validExams.length === 0) {
    datasets = [{
      label: 'NO DATA',
      data: [],
      borderColor: '#bb86fc',
      backgroundColor: 'rgba(187, 134, 252, 0.1)',
      fill: false,
      tension: 0.4
    }];
  } else if (mode === 'total') {
    datasets = [{
      label: 'TOTAL %',
      data: validExams.map(ex => (ex.total / ex.maxTotal * 100).toFixed(2)),
      borderColor: '#bb86fc',
      backgroundColor: 'rgba(187, 134, 252, 0.1)',
      fill: false,
      tension: 0.4,
      pointRadius: 6,
      pointHoverRadius: 8
    }];
  } else {
    datasets = [
      {
        label: 'CHEMISTRY %',
        data: validExams.map(ex => (ex.scores.chem / ex.maxScores.chem * 100).toFixed(2) || 0),
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'PHYSICS %',
        data: validExams.map(ex => (ex.scores.phy / ex.maxScores.phy * 100).toFixed(2) || 0),
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'BIOLOGY %',
        data: validExams.map(ex => (ex.scores.bio / ex.maxScores.bio * 100).toFixed(2) || 0),
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'MATHS %',
        data: validExams.map(ex => (ex.scores.math / ex.maxScores.math * 100).toFixed(2) || 0),
        borderColor: '#ffeb3b',
        backgroundColor: 'rgba(255, 235, 59, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ];
  }

  const isDarkTheme = !document.body.classList.contains('light-theme');
  const textColor = isDarkTheme ? '#e0e0e0' : '#000000ff';
  const gridColor = isDarkTheme ? 'rgba(51, 51, 51, 0.5)' : 'rgba(105, 105, 105, 0.5)';

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { size: 12, weight: '600' },
            padding: 20
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColor,
            font: { size: 11 },
            maxRotation: 45,
            minRotation: 0
          },
          grid: {
            color: gridColor,
            drawBorder: false
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: textColor,
            font: { size: 11 },
            stepSize: 10,
            callback: function(value) {
              return value + '%';
            }
          },
          grid: {
            color: gridColor,
            drawBorder: false
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      animation: {
        duration: 800,
        easing: 'easeInOutQuart'
      }
    }
  });
}

// Tab and UI functions
function showTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    }
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  document.getElementById(tabName).classList.add('active');
}

function toggleSubject(subjectId) {
  const content = document.getElementById(subjectId);
  const arrow = content.parentNode.querySelector('.toggle-arrow');

  content.classList.toggle('active');

  if (content.classList.contains('active')) {
    arrow.style.transform = 'rotate(180deg)';
  } else {
    arrow.style.transform = 'rotate(0deg)';
  }
}

// Search functionality
function performSearch() {
  const query = document.getElementById('search').value.trim().toLowerCase();
  if (!query) return clearSearch();

  const results = students.filter(stu =>
  stu.name.toLowerCase().includes(query) ||
  stu.roll.toLowerCase().includes(query)
);

const tbody = document.querySelector('#searchTable tbody');
tbody.innerHTML = '';

const sorted = [...results].sort((a, b) => b.cumTotal - a.cumTotal || a.roll.localeCompare(b.roll));

sorted.forEach((stu, i) => {
  const rank = stu.cumTotal > 0 ? i + 1 : '-';
  const tr = document.createElement('tr');

  if (rank >= 1 && rank <= 3 && stu.cumTotal > 0) {
    tr.classList.add('top-performer');
  }

  tr.innerHTML = `
  <td>${rank}</td>
  <td>${stu.roll}</td>
  <td class="name" data-roll="${stu.roll}">${stu.name}</td>
  <td>${stu.examsAttempted}</td>
  <td>${stu.cumTotal}</td>
  <td>${stu.cumPercent}%</td>
  `;

  tbody.appendChild(tr);
});

document.getElementById('searchCount').textContent = `${results.length} results`;
document.getElementById('searchResults').style.display = 'block';
addClickListeners();
}

function clearSearch() {
  document.getElementById('search').value = '';
  document.getElementById('searchResults').style.display = 'none';
}

// THEME TOGGLE FUNCTIONALITY - FIXED VERSION
function initializeTheme() {
  // Get saved theme from localStorage or default to 'light'
  const savedTheme = localStorage.getItem('theme') || 'light';

  // Apply the theme
  setTheme(savedTheme);

  // Update toggle button
  updateThemeToggleButton(savedTheme);
}

function setTheme(theme) {
  const html = document.documentElement;

  // Set the data-color-scheme attribute for CSS targeting
  html.setAttribute('data-color-scheme', theme);

  // Also set a class for additional styling if needed
  document.body.className = document.body.className.replace(/light|dark-theme/g, '');
  document.body.classList.add(`${theme}-theme`);

  // Save to localStorage
  localStorage.setItem('theme', theme);

  // Force re-render of dynamic elements for the last 2 buttons
  setTimeout(() => {
    // Trigger re-styling of Student Categorization if it's visible
    const studentCat = document.getElementById('studentCategorization');
    if (studentCat && studentCat.style.display !== 'none') {
      const content = studentCat.querySelector('.categorization-content');
      if (content) {
        content.style.display = 'none';
        content.offsetHeight; // Force reflow
        content.style.display = 'block';
      }
    }

    // Trigger re-styling of Performance Alerts if it's visible
    const perfAlerts = document.getElementById('performanceAlerts');
    if (perfAlerts && perfAlerts.style.display !== 'none') {
      const content = perfAlerts.querySelector('.alerts-content');
      if (content) {
        content.style.display = 'none';
        content.offsetHeight; // Force reflow
        content.style.display = 'block';
      }
    }
  }, 50);

  console.log(`Theme set to: ${theme}`);
}

function toggleTheme() {
  const currentTheme = localStorage.getItem('theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';

  // Apply new theme
  setTheme(newTheme);

  // Update button
  updateThemeToggleButton(newTheme);

  // Add a smooth transition effect
  document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';

  // Remove transition after animation
  setTimeout(() => {
    document.body.style.transition = '';
  }, 300);
}

function updateThemeToggleButton(theme) {
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    // Update button content based on theme with proper icons
    if (theme === 'light') {
      toggleBtn.innerHTML = '<i class="fas fa-moon"></i>'; // Moon icon for switching to dark mode
      toggleBtn.title = 'Switch to dark mode';
    } else {
      toggleBtn.innerHTML = '<i class="fas fa-sun"></i>'; // Sun icon for switching to light mode
      toggleBtn.title = 'Switch to light mode';
    }

    // Add visual feedback
    toggleBtn.style.transform = 'scale(0.9)';
    setTimeout(() => {
      toggleBtn.style.transform = 'scale(1)';
    }, 150);
  }
}

// Event listener for theme toggle
document.addEventListener('DOMContentLoaded', function() {
  // Initialize theme
  initializeTheme();

  // Add event listener to theme toggle button
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Initialize other functionality
  initializeApp();
});

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    toggleTheme();
  }

  // Button event listeners
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  document.getElementById('logoutBtn').addEventListener('click', function() {
    sessionStorage.clear();
    localStorage.removeItem('loggedInUser');
    window.location.href = 'index.html';
  });

  // Stats buttons
  document.getElementById('subjectDifficultyBtn').addEventListener('click', () => {
    const panel = document.getElementById('subjectDifficultyDetails');
    const isHidden = window.getComputedStyle(panel).display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
  });

  document.getElementById('examDetailsBtn').addEventListener('click', () => {
    const panel = document.getElementById('examDetails');
    const currentDisplay = window.getComputedStyle(panel).display;
    panel.style.display = currentDisplay === 'none' ? 'block' : 'none';
  });

  document.getElementById('studentDetailsBtn').addEventListener('click', () => {
    const panel = document.getElementById('studentDetails');
    const currentDisplay = window.getComputedStyle(panel).display;
    panel.style.display = currentDisplay === 'none' ? 'block' : 'none';
  });

  // Search functionality
  document.getElementById('searchButton').addEventListener('click', performSearch);
  document.getElementById('clearSearchButton').addEventListener('click', clearSearch);
  document.getElementById('search').addEventListener('keypress', e => {
    if (e.key === 'Enter') performSearch();
  });

  document.addEventListener("DOMContentLoaded", function() {
    processJsonData(sampleData);
  });

  window.addEventListener('resize', () => {
    Object.values(chartInstances).forEach(chart => {
      chart.resize(); // if using Chart.js or similar
    });
  });

});

// ===============================================================================
// ENHANCED ADMIN PORTAL WITH COLOR-CODED DIFFICULTY SCORES AND IMPROVED UI/UX
// ===============================================================================

// Override populateLast3 to use RT 1, WE 4, WE 5 specifically
function populateLast3() {
  const tbody = document.querySelector('#last3Table tbody');
  tbody.innerHTML = '';

  // Define the last 3 exams that occurred (as specified by user)

  const last3Students = students.map(stu => {
    let total = 0, maxTotal = 0, examsAttempted = 0;

    last3Exams.forEach(examName => {
      const examData = stu.exams.find(ex => ex.exam === examName && ex.maxTotal > 0);
      if (examData) {
        total += examData.total;
        maxTotal += examData.maxTotal;
        examsAttempted++;
      }
    });

    return {
      ...stu,
      last3Total: total,
      last3Percent: maxTotal > 0 ? (total / maxTotal * 100).toFixed(2) : '0.00',
      last3ExamsAttempted: examsAttempted,
      last3MaxTotal: maxTotal
    };
  });

  const sorted = last3Students.sort((a, b) => {
    if (b.last3Total !== a.last3Total) {
      return b.last3Total - a.last3Total;
    }
    return a.roll.localeCompare(b.roll);
  });

  sorted.forEach((stu, i) => {
    const rank = stu.last3Total > 0 ? i + 1 : '-';
    const tr = document.createElement('tr');

    if (rank <= 3 && rank !== '-') {
      tr.classList.add('top-performer');
    }

    tr.innerHTML = `
    <td>${rank}</td>
    <td>${stu.roll}</td>
    <td class="name" data-roll="${stu.roll}">${stu.name}</td>
    <td>${stu.last3ExamsAttempted}</td>
    <td>${stu.last3Total}</td>
    <td>${stu.last3Percent}%</td>
    `;

    tbody.appendChild(tr);
  });

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No students to display</td></tr>';
    document.getElementById('overallCount').textContent = '0 students';
    return;
  }
  document.getElementById('last3Count').textContent = `${students.length} students`;
}

// EXAM DIFFICULTY ANALYSIS WITH COLOR CODING
function toggleExamDifficultyAnalysis() {
  const detailsDiv = document.getElementById('examDifficultyDetails');
  const isVisible = detailsDiv && detailsDiv.style.display === 'block';

  hideAllDetailPanels();

  if (!isVisible) {
    detailsDiv.style.display = 'block';
    populateExamDifficultyAnalysis();
  }
}

function populateExamDifficultyAnalysis() {
  const tbody = document.getElementById('examDifficultyTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const examAnalysis = calculateExamDifficulty();

  examAnalysis.forEach((exam) => {
    const tr = document.createElement('tr');

    // Use original table row styling with enhanced colors
    if (exam.difficultyScore >= 8) {
      tr.classList.add('low-performer'); // Reuse existing class
    } else if (exam.difficultyScore <= 3) {
      tr.classList.add('top-performer'); // Reuse existing class
    }

    // Get colors based on existing theme
    const difficultyColor = getDifficultyScoreColor(exam.difficultyScore);
    const remarkColor = getRemarkColor(exam.remark);

    tr.innerHTML = `
    <td style="font-weight: 600;">${exam.name}</td>
    <td>${exam.chemPercent}%</td>
    <td>${exam.phyPercent}%</td>
    <td>${exam.bioPercent}%</td>
    <td>${exam.mathPercent}%</td>
    <td style="font-weight: 700; color: ${difficultyColor}; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
    <span style="display: inline-block; padding: 4px 8px; border-radius: 6px; background: rgba(from ${difficultyColor} r g b / 0.1); border: 1px solid rgba(from ${difficultyColor} r g b / 0.3);">
    ${exam.difficultyScore}/10
    </span>
    </td>
    <td style="font-weight: 700; color: ${remarkColor}; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
    <span style="display: inline-block; padding: 4px 12px; border-radius: 6px; background: rgba(from ${remarkColor} r g b / 0.1); border: 1px solid rgba(from ${remarkColor} r g b / 0.3);">
    ${exam.remark}
    </span>
    </td>
    `;

    tbody.appendChild(tr);
  });
}

function getDifficultyScoreColor(score) {
  // Use existing theme colors for difficulty scoring
  if (score >= 9) return '#dc3545';        // Toughest - Deep Red
  else if (score >= 8) return '#fd7e14';   // Tough - Orange Red
  else if (score >= 7) return '#ffc107';   // Above Average - Yellow
  else if (score >= 6) return '#6f42c1';   // Above Average - Purple
  else if (score >= 5) return '#6c757d';   // Moderate - Gray
  else if (score >= 4) return '#0d6efd';   // Moderate - Blue
  else if (score >= 3) return '#20c997';   // Easy - Teal
  else return '#198754';                   // Very Easy - Green
}

function getRemarkColor(remark) {
  // Use existing theme colors for remarks
  switch (remark) {
    case 'Toughest':
    return '#dc3545'; // Red
    case 'Tough':
    return '#fd7e14'; // Orange Red
    case 'Above Average':
    return '#ffc107'; // Yellow
    case 'Moderate':
    return '#6c757d'; // Gray
    case 'Easy':
    return '#20c997'; // Teal
    case 'Very Easy':
    return '#198754'; // Green
    default:
    return 'var(--color-text)';
  }
}

function calculateExamDifficulty() {
  const examStats = {};

  students.forEach(student => {
    student.exams.forEach(exam => {
      if (exam.maxTotal > 0) {
        if (!examStats[exam.exam]) {
          examStats[exam.exam] = {
            name: exam.exam,
            chemScores: [],
            phyScores: [],
            bioScores: [],
            mathScores: [],
            totalStudents: 0,
            maxScores: exam.maxScores || { chem: 40, phy: 40, bio: 40, math: 40 }
          };
        }

        examStats[exam.exam].chemScores.push(exam.scores ? exam.scores.chem || 0 : 0);
        examStats[exam.exam].phyScores.push(exam.scores ? exam.scores.phy || 0 : 0);
        examStats[exam.exam].bioScores.push(exam.scores ? exam.scores.bio || 0 : 0);
        examStats[exam.exam].mathScores.push(exam.scores ? exam.scores.math || 0 : 0);
        examStats[exam.exam].totalStudents++;
      }
    });
  });

  const examAnalysis = [];
  Object.values(examStats).forEach(examStat => {
    if (examStat.totalStudents > 0) {
      const chemAvg = examStat.chemScores.reduce((sum, score) => sum + score, 0) / examStat.chemScores.length;
      const phyAvg = examStat.phyScores.reduce((sum, score) => sum + score, 0) / examStat.phyScores.length;
      const bioAvg = examStat.bioScores.reduce((sum, score) => sum + score, 0) / examStat.bioScores.length;
      const mathAvg = examStat.mathScores.reduce((sum, score) => sum + score, 0) / examStat.mathScores.length;

      // Only calculate percentages and consider subjects that have maxScore > 0
      let validSubjects = [];
      let totalPercent = 0;

      if (examStat.maxScores.chem > 0) {
        const chemPercent = ((chemAvg / examStat.maxScores.chem) * 100);
        validSubjects.push(chemPercent);
        totalPercent += chemPercent;
      }
      if (examStat.maxScores.phy > 0) {
        const phyPercent = ((phyAvg / examStat.maxScores.phy) * 100);
        validSubjects.push(phyPercent);
        totalPercent += phyPercent;
      }
      if (examStat.maxScores.bio > 0) {
        const bioPercent = ((bioAvg / examStat.maxScores.bio) * 100);
        validSubjects.push(bioPercent);
        totalPercent += bioPercent;
      }
      if (examStat.maxScores.math > 0) {
        const mathPercent = ((mathAvg / examStat.maxScores.math) * 100);
        validSubjects.push(mathPercent);
        totalPercent += mathPercent;
      }

      // Calculate percentages for display (showing "-" for subjects with maxScore = 0)
      const chemPercent = examStat.maxScores.chem > 0 ? ((chemAvg / examStat.maxScores.chem) * 100).toFixed(1) : '-';
      const phyPercent = examStat.maxScores.phy > 0 ? ((phyAvg / examStat.maxScores.phy) * 100).toFixed(1) : '-';
      const bioPercent = examStat.maxScores.bio > 0 ? ((bioAvg / examStat.maxScores.bio) * 100).toFixed(1) : '-';
      const mathPercent = examStat.maxScores.math > 0 ? ((mathAvg / examStat.maxScores.math) * 100).toFixed(1) : '-';

      // Calculate overall average only from valid subjects
      const overallAvg = validSubjects.length > 0 ? totalPercent / validSubjects.length : 0;

      let difficultyScore = 10;
      if (overallAvg >= 80) difficultyScore = 1;
      else if (overallAvg >= 70) difficultyScore = 2;
      else if (overallAvg >= 60) difficultyScore = 3;
      else if (overallAvg >= 50) difficultyScore = 4;
      else if (overallAvg >= 40) difficultyScore = 5;
      else if (overallAvg >= 30) difficultyScore = 6;
      else if (overallAvg >= 25) difficultyScore = 7;
      else if (overallAvg >= 20) difficultyScore = 8;
      else if (overallAvg >= 15) difficultyScore = 9;

      let remark = "Toughest";
      if (difficultyScore <= 2) remark = "Very Easy";
      else if (difficultyScore <= 3) remark = "Easy";
      else if (difficultyScore <= 5) remark = "Moderate";
      else if (difficultyScore <= 7) remark = "Above Average";
      else if (difficultyScore <= 8) remark = "Tough";

      examAnalysis.push({
        name: examStat.name,
        chemPercent,
        phyPercent,
        bioPercent,
        mathPercent,
        difficultyScore,
        remark
      });
    }
  });

  // Sort by exam order
  examAnalysis.sort((a, b) => {
    const indexA = examOrder.indexOf(a.name);
    const indexB = examOrder.indexOf(b.name);

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1 && indexB === -1) return -1;
    if (indexA === -1 && indexB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  return examAnalysis;
}

// ENHANCED STUDENT CATEGORIZATION WITH IMPROVED UI/UX
function toggleStudentCategorization() {
  const detailsDiv = document.getElementById('studentCategorization');
  const isVisible = detailsDiv && detailsDiv.style.display === 'block';

  hideAllDetailPanels();

  if (!isVisible) {
    detailsDiv.style.display = 'block';
    showLoadingAnimation('studentCategorization');
    setTimeout(() => {
      populateStudentCategorization();
    }, 500);
  }
}

function populateStudentCategorization() {
  const categorization = performStudentCategorization();
  const container = document.querySelector('#studentCategorization .categorization-content');

  if (!container) return;

  // Enhanced UI with stats and animations
  container.innerHTML = `
  <div class="category-stats">
  <div class="stats-summary">
  <div class="stat-box high-performers">
  <div class="stat-number">${categorization.highPerformers.length}</div>
  <div class="stat-label">High Performers</div>
  <div class="stat-icon"><i class="fas fa-trophy"></i></div>
  </div>
  <div class="stat-box at-risk">
  <div class="stat-number">${categorization.atRiskStudents.length}</div>
  <div class="stat-label">At Risk</div>
  <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
  </div>
  <div class="stat-box improving">
  <div class="stat-number">${categorization.improvingStudents.length}</div>
  <div class="stat-label">Improving</div>
  <div class="stat-icon"><i class="fas fa-angles-up"></i></div>
  </div>
  <div class="stat-box declining">
  <div class="stat-number">${categorization.decliningStudents.length}</div>
  <div class="stat-label">Declining</div>
  <div class="stat-icon"><i class="fas fa-angles-down"></i></div>
  </div>
  </div>
  </div>

  <div class="category-section">
  <h4 class="category-title"><i class="fas fa-trophy"></i> High Performers (${categorization.highPerformers.length})</h4>
  <div class="category-list">
  ${categorization.highPerformers.length === 0 ?
  '<div class="empty-state">No high performers found. Target: ≥70% overall average</div>' :
  categorization.highPerformers.map((student, index) =>
  `<div class="category-item high-performer" style="animation-delay: ${index * 0.1}s;">
  <div class="student-info">
  <strong class="student-name">${student.name}</strong>
  <span class="student-roll">(${student.roll})</span>
  </div>
  <div class="performance-badge high">${student.score.toFixed(1)}%</div>
  <span class="category-reason">${student.reason}</span>
  </div>`
).join('')}
</div>
</div>

<div class="category-section">
<h4 class="category-title"><i class="fas fa-exclamation-triangle"></i> Students at Risk (${categorization.atRiskStudents.length})</h4>
<div class="category-list">
${categorization.atRiskStudents.length === 0 ?
'<div class="empty-state">No students at risk. Keep monitoring!</div>' :
categorization.atRiskStudents.map((student, index) =>
`<div class="category-item at-risk" style="animation-delay: ${index * 0.1}s;">
<div class="student-info">
<strong class="student-name">${student.name}</strong>
<span class="student-roll">(${student.roll})</span>
</div>
<div class="performance-badge risk">${student.score.toFixed(1)}%</div>
<span class="category-reason">${student.reason}</span>
</div>`
).join('')}
</div>
</div>

<div class="category-section">
<h4 class="category-title"><i class="fas fa-chart-line"></i> Improving Students (${categorization.improvingStudents.length})</h4>
<div class="category-list">
${categorization.improvingStudents.length === 0 ?
'<div class="empty-state">No significant improvements detected</div>' :
categorization.improvingStudents.map((student, index) =>
`<div class="category-item improving" style="animation-delay: ${index * 0.1}s;">
<div class="student-info">
<strong class="student-name">${student.name}</strong>
<span class="student-roll">(${student.roll})</span>
</div>
<div class="performance-badge improving">↗️ +${student.improvement?.toFixed(1) || 'N/A'}%</div>
<span class="category-reason">${student.reason}</span>
</div>`
).join('')}
</div>
</div>

<div class="category-section">
<h4 class="category-title"><i class="fas fa-chart-line-down"></i> Declining Students (${categorization.decliningStudents.length})</h4>
<div class="category-list">
${categorization.decliningStudents.length === 0 ?
'<div class="empty-state">No significant declines detected</div>' :
categorization.decliningStudents.map((student, index) =>
`<div class="category-item declining" style="animation-delay: ${index * 0.1}s;">
<div class="student-info">
<strong class="student-name">${student.name}</strong>
<span class="student-roll">(${student.roll})</span>
</div>
<div class="performance-badge declining">↘️ -${student.decline?.toFixed(1) || 'N/A'}%</div>
<span class="category-reason">${student.reason}</span>
</div>`
).join('')}
</div>
</div>
`;
}

// ENHANCED PERFORMANCE ALERTS WITH IMPROVED UI/UX
function togglePerformanceAlerts() {
  const detailsDiv = document.getElementById('performanceAlerts');
  const isVisible = detailsDiv && detailsDiv.style.display === 'block';

  hideAllDetailPanels();

  if (!isVisible) {
    detailsDiv.style.display = 'block';
    showLoadingAnimation('performanceAlerts');
    setTimeout(() => {
      populatePerformanceAlerts();
    }, 500);
  }
}

function populatePerformanceAlerts() {
  const alerts = generatePerformanceAlerts();
  const container = document.querySelector('#performanceAlerts .alerts-content');
  const totalAlerts = Object.values(alerts).flat().length;

  if (!container) return;

  // Update header with enhanced styling
  const header = document.querySelector('#performanceAlerts .panel-header h3');
  if (header) {
    header.innerHTML = `🚨 Performance Alert System <span class="alert-count">(${totalAlerts} alerts)</span>`;
  }

  container.innerHTML = `
  <div class="alerts-summary">
  <div class="alert-stats">
  <div class="alert-stat high-alerts">
  <div class="alert-count-number">${alerts.lowPerformance.length + alerts.suddenDrop.length}</div>
  <div class="alert-count-label">Critical</div>
  </div>
  <div class="alert-stat medium-alerts">
  <div class="alert-count-number">${alerts.missingExam.length}</div>
  <div class="alert-count-label">Medium</div>
  </div>
  <div class="alert-stat positive-alerts">
  <div class="alert-count-number">${alerts.improvementRecognition.length}</div>
  <div class="alert-count-label">Positive</div>
  </div>
  </div>
  </div>

  ${Object.entries(alerts).map(([type, alertList]) =>
  alertList.length > 0 ? `
  <div class="alert-section">
  <h4 class="alert-type-title">${getAlertTypeTitle(type)} <span class="count-badge">${alertList.length}</span></h4>
  <div class="alert-list">
  ${alertList.map((alert, index) =>
  `<div class="alert-item ${alert.severity.toLowerCase()}" style="animation-delay: ${index * 0.1}s;">
  <div class="alert-header">
  <span class="severity-badge ${alert.severity.toLowerCase()}">${alert.severity}</span>
  <div class="alert-priority ${alert.severity.toLowerCase()}">
  ${getSeverityIcon(alert.severity)}
  </div>
  </div>
  <div class="alert-message">
  ${alert.message}
  </div>
  <div class="alert-action">
  <strong>Action Required:</strong> ${alert.action}
  </div>
  <div class="alert-timestamp">
  Generated: ${new Date().toLocaleString()}
  </div>
  </div>`
).join('')}
</div>
</div>` : ''
).join('')}

${totalAlerts === 0 ?
'<div class="no-alerts"><div class="success-icon"><i class="fas fa-check-circle"></i></div><h3>All Clear!</h3><p>No performance alerts detected. Students are performing well.</p></div>' : ''}
`;
}

function getSeverityIcon(severity) {
  switch (severity) {
    case 'HIGH': return '🚨';
    case 'MEDIUM': return '<i class="fas fa-exclamation-triangle"></i>';
    case 'POSITIVE': return '🎉';
    default: return 'ℹ️';
  }
}

function showLoadingAnimation(containerId) {
  const container = document.querySelector(`#${containerId} .${containerId === 'studentCategorization' ? 'categorization-content' : 'alerts-content'}`);
  if (container) {
    container.innerHTML = `
    <div class="loading-animation">
    <div class="spinner"></div>
    <p>Analyzing student data...</p>
    </div>
    `;
  }
}

// Enhanced calculation functions (keeping original logic but adding more detailed metrics)
function performStudentCategorization() {
  const categorization = {
    highPerformers: [],
    atRiskStudents: [],
    improvingStudents: [],
    decliningStudents: []
  };

  students.forEach(student => {
    const overallPercentage = parseFloat(student.cumPercent) || 0;
    const validExams = student.exams.filter(ex => ex.maxTotal > 0);

    // Calculate improvement based on last exam relative to overall average
    let improvementRate = 0;
    if (validExams.length >= 1) {
      const lastExam = validExams[validExams.length - 1];
      const lastPercent = (lastExam.total / lastExam.maxTotal) * 100;

      // Average percentage across all exams (student.cumPercent assumed as float or number)
      const avgPercent = typeof student.cumPercent === 'string' ? parseFloat(student.cumPercent) : student.cumPercent;

      improvementRate = lastPercent - avgPercent;
    }

    // High Performers (>= 70%)
    if (overallPercentage >= 70) {
      categorization.highPerformers.push({
        ...student,
        score: overallPercentage,
        reason: `Excellent overall performance: ${overallPercentage.toFixed(1)}%`
      });
    }

    // At-risk students (< 35% or declining > 15%)
    if (overallPercentage < 35 || improvementRate < -15) {
      categorization.atRiskStudents.push({
        ...student,
        score: overallPercentage,
        reason: overallPercentage < 35 ?
        `Critical performance level: ${overallPercentage.toFixed(2)}%` :
        `Significant performance decline: ${Math.abs(improvementRate).toFixed(1)}% drop`
      });
    }

    // Improving students (> 10% improvement)
    if (improvementRate > 5) {
      categorization.improvingStudents.push({
        ...student,
        improvement: improvementRate,
        reason: `Strong upward trend: ${improvementRate.toFixed(2)}% improvement`
      });
    }

    // Declining students (< -10% but not at-risk)
    if (improvementRate < -5 && overallPercentage >= 35) {
      categorization.decliningStudents.push({
        ...student,
        decline: Math.abs(improvementRate),
        reason: `Performance declining: ${Math.abs(improvementRate).toFixed(2)}% drop`
      });
    }
  });

  return categorization;
}

function generatePerformanceAlerts() {
  const alerts = {
    lowPerformance: [],
    suddenDrop: [],
    improvementRecognition: [],
    missingExam: []
  };

  students.forEach(student => {
    const overallPercentage = parseFloat(student.cumPercent) || 0;
    const validExams = student.exams.filter(ex => ex.maxTotal > 0);
    const attemptedExams = validExams.map(ex => ex.exam);

    // Calculate recent decline
    let recentDecline = 0;
    if (validExams.length >= 1) {
      const lastExam = validExams[validExams.length - 1];
      const lastPercent = (lastExam.total / lastExam.maxTotal) * 100;

      // Average percentage across all exams (student.cumPercent assumed as float or number)
      const avgPercent = typeof student.cumPercent === 'string' ? parseFloat(student.cumPercent) : student.cumPercent;

      recentDecline = avgPercent - lastPercent;
    }

    // Low performance warnings
    if (overallPercentage < 35 && overallPercentage > 0) {
      alerts.lowPerformance.push({
        student,
        severity: overallPercentage < 25 ? 'HIGH' : 'MEDIUM',
        message: `${student.name} (${student.roll}) has critically low performance at ${overallPercentage.toFixed(2)}%`,
        action: overallPercentage < 25 ?
        'Immediate intervention required - schedule parent meeting and create recovery plan' :
        'Monitor closely and provide additional support resources'
      });
    }

    // Sudden drop alerts
    if (recentDecline > 10) {
      alerts.suddenDrop.push({
        student,
        severity: 'HIGH',
        message: `${student.name} (${student.roll}) has experienced a significant performance drop of ${recentDecline.toFixed(2)}%`,
        action: 'Investigate underlying causes, check attendance, and provide counseling support'
      });
    }

    // Calculate improvement by comparing last exam to student cumulative avg
    let improvementRate = 0;
    if (validExams.length >= 1) {
      const lastExam = validExams[validExams.length - 1];
      const lastPercent = (lastExam.total / lastExam.maxTotal) * 100;
      const avgPercent = student.cumPercent; // assuming this is the student's average % over all exams

      improvementRate = lastPercent - avgPercent;
    }

    // Use improvementRate for positive recognition alert
    if (improvementRate > 15) {
      alerts.improvementRecognition.push({
        student,
        severity: 'POSITIVE',
        message: `${student.name} (${student.roll}) has shown excellent improvement of ${improvementRate.toFixed(1)}%`,
        action: 'Acknowledge achievement and maintain current support strategies'
      });
    }
    // Missing exam alerts
    const enrolledButMissedExams = examOrder.filter(exam => {
      const hasEnrollmentData = students.some(s => 
        s.roll === student.roll && 
        s.exams.some(ex => ex.exam === exam && ex.maxTotal >= 0)
      );
      
      return hasEnrollmentData && !attemptedExams.includes(exam);
    });

    // Missing exam alerts - ONLY for enrolled exams
    if (enrolledButMissedExams.length >= 1) {
      alerts.missingExam.push({
        student,
        severity: 'MEDIUM',
        message: `${student.name} (${student.roll}) has missed ${enrolledButMissedExams.length} enrolled exams: ${enrolledButMissedExams.join(', ')}`,
        action: 'Contact student/parents immediately and arrange makeup exams if possible'
      });
    }

  });

  return alerts;
}

function getAlertTypeTitle(type) {
  const titles = {
    lowPerformance: '📉 Critical Performance Warnings',
    suddenDrop: '⬇️ Sudden Performance Drop',
    improvementRecognition: '🎉 Outstanding Improvements',
    missingExam: '❌ Attendance Issues'
  };
  return titles[type] || type;
}

function hideAllDetailPanels() {
  const panels = [
    'subjectDifficultyDetails',
    'examDetails',
    'studentDetails',
    'examDifficultyDetails',
    'studentCategorization',
    'performanceAlerts'
  ];

  panels.forEach(panelId => {
    const panel = document.getElementById(panelId);
    if (panel) panel.style.display = 'none';
  });
}

// Mobile-friendly utility to open print window
function openPrintWindow(title, content) {
  // Create mobile-optimized print styles
  const printStyles = `
  <style>
  @media print {
    body * { visibility: hidden; }
    .print-content, .print-content * { visibility: visible; }
    .print-content { position: absolute; left: 0; top: 0; width: 100%; }
  }
  .print-content {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    width: 97%;
    margin: 20px;
    background: white;
    color: black;
  }
  .print-header {
    text-align: center;
    border-bottom: 3px solid #2c5aa0;
    padding-bottom: 15px;
    margin-bottom: 25px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 10px;
    padding: 20px;
  }
  .print-header img {
    width: 150px;
    height: auto;
    margin-bottom: 10px;
  }
  .print-header h1 {
    margin: 12px 0;
    font-size: 20pt;
    color: #2c5aa0;
    font-weight: 700;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
  }
  .enhanced-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 4px;
    font-size: 10pt;
    margin-top: 15px;
  }
  .enhanced-table thead tr {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    transform: skew(-2deg);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  .enhanced-table thead th {
    padding: 12px 8px;
    font-weight: 700;
    text-align: center;
    border: none;
    font-size: 10pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transform: skew(2deg);
  }
  .enhanced-table tbody tr {
    background: white;
    transform: skew(-1deg);
    transition: all 0.3s ease;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 2px;
  }
  .enhanced-table tbody tr:nth-child(even) {
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  }
  .enhanced-table tbody tr:nth-child(odd) {
    background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
  }
  .enhanced-table tbody tr:hover {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    transform: skew(-1deg) translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
  .enhanced-table tbody td {
    padding: 10px 8px;
    border: none;
    transform: skew(1deg);
    border-left: 3px solid transparent;
  }
  /* Rank column styling */
  .enhanced-table tbody td:nth-child(1) {
    text-align: center;
    font-weight: 700;
    color: #1e40af;
    background: rgba(59, 130, 246, 0.1);
    border-left: 3px solid #3b82f6;
    font-size: 11pt;
  }
  /* Roll number styling */
  .enhanced-table tbody td:nth-child(2) {
    text-align: center;
    font-weight: 600;
    color: #374151;
  }
  /* Name column - left aligned */
  .enhanced-table tbody td:nth-child(3) {
    text-align: left;
    font-weight: 600;
    color: #1f2937;
    padding-left: 12px;
  }
  /* Subject scores - center aligned */
  .enhanced-table tbody td:nth-child(4),
  .enhanced-table tbody td:nth-child(5),
  .enhanced-table tbody td:nth-child(6),
  .enhanced-table tbody td:nth-child(7) {
    text-align: center;
    color: #4b5563;
    font-weight: 500;
  }
  /* Total score column - bold and highlighted */
  .enhanced-table tbody td:nth-child(8) {
    text-align: center;
    font-weight: 700;
    color: #059669;
    background: rgba(16, 185, 129, 0.1);
    border-left: 3px solid #10b981;
    font-size: 11pt;
  }
  /* Percentage column - bold and highlighted */
  .enhanced-table tbody td:nth-child(9) {
    text-align: center;
    font-weight: 700;
    color: #dc2626;
    background: rgba(239, 68, 68, 0.1);
    border-left: 3px solid #ef4444;
    font-size: 11pt;
  }
  /* Top 3 rank special styling */
  .enhanced-table tbody tr:nth-child(1) td:nth-child(1) {
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
    color: #92400e;
    border-left: 4px solid #f59e0b;
  }
  .enhanced-table tbody tr:nth-child(2) td:nth-child(1) {
    background: linear-gradient(135deg, #c0c0c0 0%, #e5e7eb 100%);
    color: #374151;
    border-left: 4px solid #6b7280;
  }
  .enhanced-table tbody tr:nth-child(3) td:nth-child(1) {
    background: linear-gradient(135deg, #cd7f32 0%, #f97316 100%);
    color: #ffffff;
    border-left: 4px solid #ea580c;
  }
  @media (max-width: 600px) {
    .print-content { margin: 10px; }
    .enhanced-table { font-size: 9pt; }
    .enhanced-table th, .enhanced-table td { padding: 6px 4px; }
    .print-header img { width: 70px; }
    .print-header h1 { font-size: 16pt; }
  }

  </style>
  `;

  // Create new window for better mobile compatibility
  const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');

  if (!printWindow) {
    // Fallback for popup blockers
    alert('Please allow popups and try again, or use the download option.');
    return;
  }

  printWindow.document.write(`
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${printStyles}
  </head>
  <body>
  <div class="print-content">
  <div class="print-header">
  <img src="logo2.png" alt="Logo">
  <h1>${title}</h1>
  </div>
  ${content}
  </div>
  </div>
  </body>
  </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  // Auto-print after a small delay (works better on mobile)
  setTimeout(() => {
    try {
      printWindow.print();
    } catch (e) {
      console.log('Auto-print failed, user can use manual button');
    }
  }, 1000);
}

// Updated functions remain the same, just call the improved openPrintWindow
function printOverallRanklist() {
  const table = document.querySelector("#overallRank table");
  if (!table) return alert("Overall ranklist not available!");
  openPrintWindow("OVERALL RANKLIST", table.outerHTML);
}

function printLast3Ranklist() {
  const table = document.querySelector("#last3Rank table");
  if (!table) return alert("Last 3 exams ranklist not available!");
  openPrintWindow("LAST 3 EXAMS RANKLIST", table.outerHTML);
}


// Enhanced Print Dialog Functions with Exam Selection Modal
let currentPrintType = '';

// Make sure filter variables exist
if (typeof currentOverallFilter === 'undefined') {
    var currentOverallFilter = 'all';
}
if (typeof currentLast3Filter === 'undefined') {
    var currentLast3Filter = 'all';
}

function openOverallPrintDialog() {
  currentPrintType = 'overall';
  document.getElementById('printDialogTitle').textContent = 'Print Overall Ranklist';
  document.getElementById('printFilterDialog').style.display = 'flex';
  // Reset to 'all' selection
  document.querySelector('input[name="printFilter"][value="all"]').checked = true;
}

function openLast3PrintDialog() {
  currentPrintType = 'last3';
  document.getElementById('printDialogTitle').textContent = 'Print Last 3 Exams Ranklist';
  document.getElementById('printFilterDialog').style.display = 'flex';
  // Reset to 'all' selection
  document.querySelector('input[name="printFilter"][value="all"]').checked = true;
}

function closePrintFilterDialog() {
  document.getElementById('printFilterDialog').style.display = 'none';
  currentPrintType = '';
}

function executePrint() {
  const selectedFilter = document.querySelector('input[name="printFilter"]:checked');
  if (!selectedFilter) {
    alert('Please select a filter option');
    return;
  }

  const filterValue = selectedFilter.value;

  if (currentPrintType === 'overall') {
    printOverallRanklistWithFilter(filterValue);
  } else if (currentPrintType === 'last3') {
    printLast3RanklistWithFilter(filterValue);
  }

  closePrintFilterDialog();
}

function printOverallRanklistWithFilter(filterType) {
  console.log('Printing overall ranklist with filter:', filterType);

  // Store the current filter to restore later
  const originalFilter = currentOverallFilter || 'all';

  // Apply the print filter if it's different from current
  if (filterType !== originalFilter) {
    console.log('Applying filter:', filterType);
    filterOverallRanklist(filterType);
  }

  // Wait a moment for the filter to be applied, then get the table
  setTimeout(() => {
    const table = document.querySelector("#overallRank table");
    if (!table) {
      alert("Overall ranklist not available!");
      return;
    }

    // Create title with filter info
    let title = "OVERALL RANKLIST";
    if (filterType === 'RT') {
      title += " (RT ONLY)";
    } else if (filterType === 'WE') {
      title += " (WE ONLY)";  
    } else if (filterType === 'MT') {
      title += " (MT ONLY)";  
    }

    console.log('Opening print window with title:', title);
    openPrintWindow(title, table.outerHTML);

    // Restore original filter after a delay
    setTimeout(() => {
      if (originalFilter !== filterType) {
        console.log('Restoring original filter:', originalFilter);
        filterOverallRanklist(originalFilter);
      }
    }, 1000);
  }, 200);
}

function printLast3RanklistWithFilter(filterType) {
  console.log('Printing last 3 ranklist with filter:', filterType);

  // Store the current filter to restore later
  const originalFilter = currentLast3Filter || 'all';

  // Apply the print filter if it's different from current
  if (filterType !== originalFilter) {
    console.log('Applying filter:', filterType);
    filterLast3Ranklist(filterType);
  }

  // Wait a moment for the filter to be applied, then get the table
  setTimeout(() => {
    const table = document.querySelector("#last3Rank table");
    if (!table) {
      alert("Last 3 exams ranklist not available!");
      return;
    }

    // Create title with filter info
    let title = "LAST 3 EXAMS RANKLIST";
    if (filterType === 'RT') {
      title += " (RT ONLY)";
    } else if (filterType === 'WE') {
      title += " (WE ONLY)";
    } else if (filterType === 'MT') {
      title += " (MT ONLY)";
    }

    console.log('Opening print window with title:', title);
    openPrintWindow(title, table.outerHTML);

    // Restore original filter after a delay
    setTimeout(() => {
      if (originalFilter !== filterType) {
        console.log('Restoring original filter:', originalFilter);
        filterLast3Ranklist(originalFilter);
      }
    }, 1000);
  }, 200);
}

// Enhanced Exam Selection Modal Functions
function openExamSelectionDialog() {
    // Get available exams from students data (from backend)
    const exams = [...new Set(
        students.flatMap(s => 
            s.exams
                .filter(e => e.maxTotal > 0)
                .map(e => e.exam)
        )
    )];
    
    // Sort exams by the predefined order
    const sortedExams = exams.sort((a, b) => {
        const indexA = examOrder.indexOf(a);
        const indexB = examOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    // Populate the exam selection grid
    const grid = document.getElementById('examSelectionGrid');
    grid.innerHTML = '';

    sortedExams.forEach(exam => {
        // Get exam data from students instead of sampleData
        const examData = students
            .flatMap(s => 
                s.exams
                    .filter(e => e.exam === exam && e.maxTotal > 0)
                    .map(e => ({ ...s, ...e }))
            );

        const hasData = examData.length > 0;

        const examButton = document.createElement('button');
        examButton.className = hasData ? 'exam-option' : 'exam-option disabled';
        examButton.onclick = hasData ? () => selectAndPrintExam(exam) : null;
        examButton.disabled = !hasData;
        examButton.innerHTML = `
            <div class="exam-icon">
                <i class="fas ${exam.startsWith('RT') ? 'fa-clock' : 'fa-calendar-week'}"></i>
            </div>
            <div class="exam-info">
                <span class="exam-name">${exam}</span>
                <span class="exam-students">${examData.length} students</span>
            </div>
        `;
        grid.appendChild(examButton);
    });

    document.getElementById('examSelectionDialog').style.display = 'flex';
}

function closeExamSelectionDialog() {
    const dialog = document.getElementById('examSelectionDialog');
    if (dialog) {
        dialog.style.display = 'none';
    }
}


function selectAndPrintExam(examName) {
    console.log('Printing exam:', examName);
    closeExamSelectionDialog();

    // Get exam data from students (transformed structure)
    const examData = students
        .map(stu => {
            const examData = stu.exams.find(e => e.exam === examName && e.maxTotal > 0);
            if (!examData) return null;
            return {
                roll: stu.roll,
                name: stu.name,
                chem: examData.scores.chem,
                phy: examData.scores.phy,
                bio: examData.scores.bio,
                math: examData.scores.math,
                total: examData.total,
                percent: examData.total / examData.maxTotal * 100
            };
        })
        .filter(d => d !== null)
        .sort((a, b) => b.total - a.total);

    if (examData.length === 0) {
        alert('No data available for selected exam');
        return;
    }

    // Create the ranklist HTML
    let html = `
        <table class="enhanced-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>R. No</th>
                    <th>Name</th>
                    <th>Chm</th>
                    <th>Phy</th>
                    <th>Bio</th>
                    <th>Mth</th>
                    <th>Total</th>
                    <th>%</th>
                </tr>
            </thead>
            <tbody>
    `;

    examData.forEach((d, i) => {
        html += `
            <tr>
                <td>${i + 1}</td>
                <td>${d.roll}</td>
                <td>${d.name}</td>
                <td>${d.chem}</td>
                <td>${d.phy}</td>
                <td>${d.bio}</td>
                <td>${d.math}</td>
                <td><strong>${d.total}</strong></td>
                <td>${d.percent.toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    openPrintWindow(examName + ' RANKLIST', html);
}

// Initialize after DOM loads
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    // Re-populate last3 with corrected logic
    if (typeof populateStats === 'function') {
      populateStats();
    }
  }, 100);
});

// Initialize app function
function initializeApp() {
  // Process data and initialize all components
  processJsonData(sampleData);

  // Add any additional initialization here
  console.log('Enhanced Admin Portal initialized successfully!');
}

// ============= PRINT & EXPORT FUNCTIONALITY =============

// Initialize Print & Export Feature
function initializePrintExport() {
  const printExportBtn = document.getElementById('printExportBtn');
  const printStudentProfileBtn = document.getElementById('printStudentProfileBtn');

  if (printExportBtn) {
    printExportBtn.addEventListener('click', openPrintExportModal);
  }

  if (printStudentProfileBtn) {
    printStudentProfileBtn.addEventListener('click', printSelectedStudentProfile);
  }
}

// Open Print & Export Modal
function openPrintExportModal() {
  const modal = document.getElementById('printExportModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

// Close Print & Export Modal
function closePrintExportModal() {
  const modal = document.getElementById('printExportModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// PRINT EXPORT MODAL FUNCTIONS
function initializePrintExport() {
  const printExportBtn = document.getElementById('printExportBtn');
  if (printExportBtn) {
    printExportBtn.addEventListener('click', openPrintExportModal);
  }

  // Initialize print student profile button specifically
  const printStudentProfileBtn = document.getElementById('printStudentProfileBtn');
  if (printStudentProfileBtn) {
    printStudentProfileBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const select = document.getElementById('studentProfileSelect');
      if (!select || !select.value) {
        alert('Please select a student first!');
        return;
      }
      const roll = select.value;
      const student = students.find(s => s.roll === roll);
      if (!student) {
        alert('Student not found!');
        return;
      }
      printStudentProfileReport(student);
      closeStudentProfileModal();
    });
  }
}

function openPrintExportModal() {
  const modal = document.getElementById('printExportModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closePrintExportModal() {
  const modal = document.getElementById('printExportModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function selectStudentForProfile() {
  closePrintExportModal();
  const modal = document.getElementById('studentProfileModal');
  const select = document.getElementById('studentProfileSelect');

  if (modal && select) {
    // Populate student dropdown sorted by roll number
    select.innerHTML = '<option value="">Select a student...</option>';

    if (students && students.length > 0) {
      // Sort students by roll ascending (numerically if roll contains numbers)
      const sortedStudents = [...students].sort((a, b) => {
        // Extract numeric part from roll if any, fallback to string
        const aNum = parseInt(a.roll.replace(/\D/g, ''), 10);
        const bNum = parseInt(b.roll.replace(/\D/g, ''), 10);

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        } else {
          return a.roll.localeCompare(b.roll);
        }
      });

      sortedStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.roll;
        option.textContent = `${student.name} (${student.roll})`;
        select.appendChild(option);
      });
    }
    modal.style.display = 'flex';
  }

}

function closeStudentProfileModal() {
  const modal = document.getElementById('studentProfileModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function printStudentProfileReport(student) {
  const totalExams = student.exams.length;
  const totalScore = student.cumTotal;
  const maxPossibleScore = student.cumMax;
  const averagePercent = parseFloat(student.cumPercent);

  // Function to convert subject short codes to full names
  const getFullSubjectName = (shortName) => {
    const subjectMap = {
      'CHEMISTRY': 'Chemistry',
      'PHYSICS': 'Physics',
      'BIOLOGY': 'Biology',
      'MATHEMATICS': 'Mathematics',
      'chem': 'Chemistry',
      'phy': 'Physics',
      'bio': 'Biology',
      'math': 'Mathematics'
    };
    return subjectMap[shortName] || shortName;
  };

  // Convert subject arrays to full names
  const strongSubjectsFullNames = student.strongSubject.map(s => getFullSubjectName(s));
  const weakSubjectsFullNames = student.weakSubject.map(s => getFullSubjectName(s));

  const printStyles = `
    <style>
      @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

      @media print {
        body > *:not(.student-profile-print) { display: none !important; }
        body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .student-profile-print { display: block !important; visibility: visible !important; width: 95%; margin: 0; padding: 20px; background: white; }

        /* Header */
        .student-profile-print .print-header{text-align:center;background:linear-gradient(135deg,#2563eb 0%,#7c3aed 50%,#ec4899 100%);padding:20px;border-radius:10px;margin-bottom:20px;position:relative;overflow:hidden}
        .student-profile-print .print-header::before{content:'';position:absolute;top:-50%;right:-10%;width:250px;height:250px;background:rgba(255,255,255,0.1);border-radius:50%}
        .student-profile-print .print-header img{max-width:120px;margin-bottom:8px;position:relative;z-index:2}
        .student-profile-print .print-header h1{font-size:20pt;font-weight:800;color:#fff!important;margin:6px 0 4px;position:relative;z-index: 2;text-shadow: 2px 2px 4px rgba(0,0,0,0.2);}
        .student-profile-print .print-header p{font-size:9pt;color:#fff!important;margin:2px 0;font-weight:500;position:relative;z-index: 2;}
        /* Footer */
        .student-profile-print .print-footer { -webkit-print-color-adjust: exact !important;print-color-adjust: exact !important;text-align:center;margin-top: 20px;padding-top: 10px;border-top: 3px solid #3b82f6;color: #6b7280 !important;font-size: 8pt}
        @media (max-width: 600px) {
        .student-profile-print .print-header img { width: 70px}
        .student-profile-print .print-header h1 { font-size: 16pt}
        }
        .student-profile-print .profile-section {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border: 2px solid #e0e7ff;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 18px;
          page-break-inside: avoid;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .student-profile-print .profile-section h3 {
          font-size: 14pt;
          font-weight: 700;
          color: #1e40af !important;
          margin: 0 0 14px 0;
          padding-bottom: 10px;
          border-bottom: 3px solid #3b82f6;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .student-profile-print .profile-section h3 i {
          font-size: 16pt;
          color: #3b82f6 !important;
        }
        .student-profile-print .profile-section h3::before {
          content: '';
          width: 4px;
          height: 20px;
          background: linear-gradient(180deg, #3b82f6, #8b5cf6);
          border-radius: 2px;
        }
        .student-profile-print .profile-section p {
          font-size: 10pt;
          line-height: 1.6;
          margin: 6px 0;
          color: #374151 !important;
        }
        .student-profile-print .profile-section strong {
          color: #1f2937 !important;
          font-weight: 600;
          display: inline-block;
          min-width: 140px;
        }
        .student-profile-print .performance-summary {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border-left: 4px solid #10b981;
          padding: 16px;
          border-radius: 6px;
          margin: 12px 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .student-profile-print .performance-summary strong {
          color: #047857 !important;
        }
        .student-profile-print table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          border-radius: 6px;
          overflow: hidden;
          margin: 12px 0;
          page-break-inside: avoid;
        }
        .student-profile-print table thead {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .student-profile-print table th {
          padding: 10px 8px;
          text-align: left;
          font-weight: 700;
          font-size: 9pt;
          color: white !important;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          border: none;
        }
        .student-profile-print table td {
          padding: 9px 8px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 9pt;
          color: #374151 !important;
          background: white;
        }
        .student-profile-print table tbody tr:nth-child(odd) td {
          background: #f9fafb !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .student-profile-print table tbody tr:last-child td {
          border-bottom: none;
        }
        .student-profile-print .strong-subject {
          background: #d1fae5 !important;
          color: #047857 !important;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 600;
          display: inline-block;
          border: 1px solid #10b981;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .student-profile-print .weak-subject {
          background: #fee2e2 !important;
          color: #dc2626 !important;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 600;
          display: inline-block;
          border: 1px solid #ef4444;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .student-profile-print .recommendations {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #fbbf24;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .student-profile-print .recommendations h3 {
          color: #92400e !important;
          border-bottom-color: #f59e0b;
        }
        .student-profile-print .recommendations h3 i {
          color: #f59e0b !important;
        }
        .student-profile-print .recommendations p {
          color: #78350f !important;
          font-weight: 500;
        }
      }
    </style>
  `;

  const printContent = `
    ${printStyles}
    <div class="student-profile-print">
      <div class="print-header">
        <img src="logo2.png" alt="Institute Logo">
        <h1>STUDENT PROFILE</h1>
        <p>CRISPR Year-long Batch 2025-26</p>
        <p>Student Performance Analysis Report</p>
      </div>

      <div class="profile-section">
        <h3><i class="fas fa-clipboard-list"></i> STUDENT INFORMATION</h3>
        <div class="performance-summary">
          <p><strong>Name:</strong> ${student.name}</p>
          <p><strong>Roll Number:</strong> ${student.roll}</p>
          <p><strong>Exams Attempted:</strong> ${totalExams}</p>
          <p><strong>Overall Percentage:</strong> ${averagePercent.toFixed(2)}%</p>
          <p><strong>Total Score:</strong> ${totalScore} / ${maxPossibleScore}</p>
          <p><strong>Average Score:</strong> ${(totalScore / Math.max(totalExams, 1)).toFixed(2)}</p>
        </div>
      </div>

      <div class="profile-section">
        <h3><i class="fas fa-dumbbell"></i> SUBJECT PERFORMANCE</h3>
        <p><strong>Strong Subjects:</strong> <span class="strong-subject">${strongSubjectsFullNames.join('</span> <span class="strong-subject">')}</span></p>
        <p><strong>Weak Subjects:</strong> <span class="weak-subject">${weakSubjectsFullNames.join('</span> <span class="weak-subject">')}</span></p>
        <table>
          <thead>
            <tr>
              <th>SUBJECT</th>
              <th>AVG %</th>
              <th>PERFORMANCE</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Chemistry</td><td>${student.subjectAverages.chem}%</td><td>${getPerformanceLevel(student.subjectAverages.chem)}</td></tr>
            <tr><td>Physics</td><td>${student.subjectAverages.phy}%</td><td>${getPerformanceLevel(student.subjectAverages.phy)}</td></tr>
            <tr><td>Biology</td><td>${student.subjectAverages.bio}%</td><td>${getPerformanceLevel(student.subjectAverages.bio)}</td></tr>
            <tr><td>Mathematics</td><td>${student.subjectAverages.math}%</td><td>${getPerformanceLevel(student.subjectAverages.math)}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="profile-section">
        <h3><i class="fas fa-chart-bar"></i> EXAM BREAKDOWN</h3>
        <table>
          <thead>
            <tr><th>Exam</th><th>Rank</th><th>Chem</th><th>Phy</th><th>Bio</th><th>Math</th><th>Total</th><th>%</th></tr>
          </thead>
          <tbody>
            ${student.exams.map(exam => {
              if (exam.maxTotal === 0) return '';
              return `<tr>
                <td>${exam.exam}</td>
                <td>${getExamRank(student, exam.exam)}</td>
                <td>${exam.scores.chem}/${exam.maxScores.chem}</td>
                <td>${exam.scores.phy}/${exam.maxScores.phy}</td>
                <td>${exam.scores.bio}/${exam.maxScores.bio}</td>
                <td>${exam.scores.math}/${exam.maxScores.math}</td>
                <td>${exam.total}/${exam.maxTotal}</td>
                <td>${exam.percent.toFixed(2)}%</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="profile-section recommendations">
        <h3><i class="fas fa-lightbulb"></i> RECOMMENDATIONS</h3>
        <p><strong>Areas for Improvement:</strong> Focus on ${weakSubjectsFullNames.join(' and ')} to boost overall performance.</p>
        <p><strong>Strengths to Maintain:</strong> Continue excellent work in ${strongSubjectsFullNames.join(' and ')}.</p>
        <p><strong>Study Tips:</strong> Regular practice and consistent revision will help improve weaker areas.</p>
      </div>

        <div class="print-footer">
            <p><strong>CRISPR • Year-long Batch 2025–26</strong></p>
            <p>This is an automated report generated by the Student Performance Tracking System</p>
            <p>Generated on ${currentDate} • For queries, contact the academic administration</p>
        </div>
    </div>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

function getPerformanceLevel(percentage) {
  const percent = parseFloat(percentage);
  if (percent >= 80) return 'Excellent';
  if (percent >= 65) return 'Good';
  if (percent >= 50) return 'Average';
  if (percent >= 35) return 'Below Average';
  return 'Needs Improvement';
}

function openClassPerformanceModal() {
    closePrintExportModal();
    currentPrintType = 'classPerformance';
    document.getElementById('printDialogTitle').textContent = 'Class Performance Summary';
    document.getElementById('printFilterDialog').style.display = 'flex';
    document.querySelector('input[name="printFilter"][value="all"]').checked = true;
}
function executePrint() {
    const selectedFilter = document.querySelector('input[name="printFilter"]:checked');
    if (!selectedFilter) {
        alert('Please select a filter option');
        return;
    }
    
    const filterValue = selectedFilter.value;
    
    if (currentPrintType === 'overall') {
        printOverallRanklistWithFilter(filterValue);
    } else if (currentPrintType === 'last3') {
        printLast3RanklistWithFilter(filterValue);
    } else if (currentPrintType === 'classPerformance') {
        printClassPerformanceSummary(filterValue);
    }
    
    closePrintFilterDialog();
}

// ================= CLASS PERFORMANCE SUMMARY - FINAL CORRECTED CODE =================
// Copy this ENTIRE code block to the END of your script.js file

function printClassPerformanceSummary(filterType) {
    const filteredExams = getFilteredExamsForReport(filterType);
    
    if (filteredExams.length === 0) {
        alert('No exams available for the selected filter.');
        return;
    }
    
    const stats = calculateClassStatistics(filteredExams);
    const topPerformers = getTopPerformers(filteredExams, 5);
    const atRiskStudents = getAtRiskStudents(filteredExams, 5);
    const subjectStats = calculateSubjectStatistics(filteredExams);
    const examStats = calculateExamStatistics(filteredExams);
    
    const htmlContent = generateClassPerformanceHTML(
        filterType,
        filteredExams,
        stats,
        topPerformers,
        atRiskStudents,
        subjectStats,
        examStats
    );
    
    const printWindow = window.open('', '', 'width=900,height=700');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };
}

function getFilteredExamsForReport(filterType) {
    if (filterType === 'all') {
        return examOrder;
    } else if (filterType === 'RT') {
        return examOrder.filter(exam => exam.startsWith('RT'));
    } else if (filterType === 'WE') {
        return examOrder.filter(exam => exam.startsWith('WE'));
    } else if (filterType === 'MT') {
        return examOrder.filter(exam => exam.startsWith('MT'));
    }
    return examOrder;
}

function calculateClassStatistics(exams) {
    let totalParticipations = 0;
    let totalScore = 0;
    let totalMaxScore = 0;
    let passCount = 0;
    let failCount = 0;
    let studentsWithData = new Set();
    
    students.forEach(student => {
        let studentTotal = 0;
        let studentMax = 0;
        
        student.exams.forEach(ex => {
            if (exams.includes(ex.exam) && ex.maxTotal > 0) {
                studentTotal += ex.total;
                studentMax += ex.maxTotal;
                totalParticipations++;
                studentsWithData.add(student.roll);
            }
        });
        
        if (studentMax > 0) {
            totalScore += studentTotal;
            totalMaxScore += studentMax;
            const percent = (studentTotal / studentMax) * 100;
            if (percent >= 60) passCount++;
            if (percent < 35) failCount++;
        }
    });
    
    const avgPercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    const passRate = studentsWithData.size > 0 ? (passCount / studentsWithData.size) * 100 : 0;
    const participationRate = students.length > 0 ? (studentsWithData.size / students.length) * 100 : 0;
    const failRate = studentsWithData.size > 0 ? (failCount / studentsWithData.size) * 100 : 0;
    
    return {
        totalStudents: students.length,
        activeStudents: studentsWithData.size,
        avgPercentage: avgPercentage.toFixed(2),
        passRate: passRate.toFixed(2),
        failRate: failRate.toFixed(2),
        participationRate: participationRate.toFixed(2),
        passCount,
        failCount,
        totalScore,
        totalMaxScore,
        totalExams: exams.length
    };
}

function getTopPerformers(exams, count) {
    const studentScores = students.map(student => {
        let total = 0, maxTotal = 0, examsAttempted = 0;
        student.exams.forEach(ex => {
            if (exams.includes(ex.exam) && ex.maxTotal > 0) {
                total += ex.total;
                maxTotal += ex.maxTotal;
                examsAttempted++;
            }
        });
        const percent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
        return {
            roll: student.roll,
            name: student.name,
            total,
            maxTotal,
            percentage: percent.toFixed(2),
            examsAttempted
        };
    }).filter(s => s.maxTotal > 0);
    return studentScores.sort((a, b) => b.total - a.total).slice(0, count);
}

function getAtRiskStudents(exams, count) {
    const studentScores = students.map(student => {
        let total = 0, maxTotal = 0, examsAttempted = 0;
        student.exams.forEach(ex => {
            if (exams.includes(ex.exam) && ex.maxTotal > 0) {
                total += ex.total;
                maxTotal += ex.maxTotal;
                examsAttempted++;
            }
        });
        const percent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
        return {
            roll: student.roll,
            name: student.name,
            total,
            maxTotal,
            percentage: percent.toFixed(2),
            examsAttempted
        };
    }).filter(s => s.maxTotal > 0 && parseFloat(s.percentage) < 35);
    return studentScores.sort((a, b) => a.percentage - b.percentage).slice(0, count);
}

function calculateSubjectStatistics(exams) {
    const subjects = ['chem', 'phy', 'bio', 'math'];
    const subjectStats = {};
    
    subjects.forEach(subject => {
        let totalScore = 0, maxScore = 0, count = 0, highestScore = -Infinity, lowestScore = Infinity;
        
        // Convert students array to flat structure for processing
        const flatData = students.flatMap(stu => 
            stu.exams.map(ex => ({
                exam: ex.exam,
                chem: ex.scores.chem,
                phy: ex.scores.phy,
                bio: ex.scores.bio,
                math: ex.scores.math,
                maxChem: ex.maxScores.chem,
                maxPhy: ex.maxScores.phy,
                maxBio: ex.maxScores.bio,
                maxMath: ex.maxScores.math,
                maxTotal: ex.maxTotal
            }))
        );
        
        flatData.forEach(data => {
            if (exams.includes(data.exam) && data.maxTotal > 0) {
                const maxKey = 'max' + subject.charAt(0).toUpperCase() + subject.slice(1);
                const subMax = data[maxKey];
                const subScore = data[subject];
                
                if (subMax > 0) {
                    totalScore += subScore;
                    maxScore += subMax;
                    count++;
                    if (subScore > highestScore) highestScore = subScore;
                    if (subScore < lowestScore) lowestScore = subScore;
                }
            }
        });
        
        const avgPercentage = maxScore > 0 ? (totalScore / maxScore * 100) : 0;
        subjectStats[subject] = {
            name: subjectNames[subject],
            avgPercentage: avgPercentage.toFixed(2),
            totalScore,
            maxScore,
            highestScore: highestScore === -Infinity ? 0 : highestScore,
            lowestScore: lowestScore === Infinity ? 0 : lowestScore,
            count
        };
    });
    
    return subjectStats;
}

function calculateExamStatistics(exams) {
    return exams.map(examName => {
        let totalScore = 0, maxScore = 0, studentCount = 0, highestScore = -Infinity, lowestScore = Infinity;
        
        students.forEach(student => {
            const exam = student.exams.find(ex => ex.exam === examName);
            if (exam && exam.maxTotal > 0) {
                totalScore += exam.total;
                maxScore += exam.maxTotal;
                studentCount++;
                if (exam.total > highestScore) highestScore = exam.total;
                if (exam.total < lowestScore) lowestScore = exam.total;
            }
        });
        
        const avgPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        const avgScore = studentCount > 0 ? (totalScore / studentCount).toFixed(2) : 0;
        
        // Use the SAME difficulty calculation everywhere
        let difficulty;
        if (avgPercentage >= 60) {
            difficulty = 'Easy';
        } else if (avgPercentage >= 40) {
            difficulty = 'Moderate';
        } else {
            difficulty = 'Difficult';
        }
        
        return {
            name: examName,
            avgPercentage: avgPercentage.toFixed(2),
            studentCount,
            totalStudents: students.length,
            participationRate: ((studentCount / students.length) * 100).toFixed(2),
            highestScore: highestScore === -Infinity ? 0 : highestScore,
            lowestScore: lowestScore === Infinity ? 0 : lowestScore,
            avgScore,
            difficulty
        };
    });
}

function generateClassPerformanceHTML(filterType, exams, stats, topPerformers, atRiskStudents, subjectStats, examStats) {
    const filterLabel = filterType === 'all' ? 'All Exams' : filterType === 'RT' ? 'Revision Tests (RT)' : filterType === 'WE' ? 'Weekly Exams (WE)' : 'Mega Tests (MT)';
    const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const subjectsArray = Object.values(subjectStats);
    const strongest = subjectsArray.reduce((max, s) => parseFloat(s.avgPercentage) > parseFloat(max.avgPercentage) ? s : max, subjectsArray[0]);
    const weakest = subjectsArray.reduce((min, s) => parseFloat(s.avgPercentage) < parseFloat(min.avgPercentage) ? s : min, subjectsArray[0]);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Class Performance Summary - ${filterLabel}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
        
        @media print {
            @page { 
                size: A4; 
                margin: 10mm; 
            }
            body { 
                margin: 0; 
                padding: 0;
            }
        }
        
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 15px;
            background: white;
            color: #1a1a1a;
        }
        
        /* Header */
        .print-header{text-align:center;background:linear-gradient(135deg,#2563eb 0%,#7c3aed 50%,#ec4899 100%);padding:20px;border-radius:10px;margin-bottom:20px;position:relative;overflow:hidden}
        .print-header::before{content:'';position:absolute;top:-50%;right:-10%;width:250px;height:250px;background:rgba(255,255,255,0.1);border-radius:50%}
        .print-header img{max-width:120px;margin-bottom:8px;position:relative;z-index:2}
        .print-header h1{font-size:20pt;font-weight:800;color:#fff!important;margin:6px 0 4px;position:relative;z-index: 2;text-shadow: 2px 2px 4px rgba(0,0,0,0.2);}
        .print-header p{font-size:9pt;color:#fff!important;margin:2px 0;font-weight:500;position:relative;z-index: 2;}
        /* Footer */
        .print-footer { -webkit-print-color-adjust: exact !important;print-color-adjust: exact !important;text-align:center;margin-top: 20px;padding-top: 10px;border-top: 3px solid #3b82f6;color: #6b7280 !important;font-size: 8pt}
        @media (max-width: 600px) {
        .print-header img { width: 70px}
        .print-header h1 { font-size: 16pt}
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%);
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #cbd5e1;
        }
        
        .stat-card h3 {
            margin: 0 0 6px 0;
            font-size: 9pt;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            font-weight: 600;
        }
        
        .stat-card .value {
            font-size: 24pt;
            font-weight: bold;
            color: #2563eb;
            margin: 0;
        }
        
        .stat-card .sub-value {
            font-size: 8pt;
            color: #64748b;
            margin-top: 3px;
        }
        
        .section {
            margin-bottom: 15px;
            page-break-inside: avoid;
        }
        
        .section-title {
            background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
            color: white !important;
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 8px;
            font-size: 12pt;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .section-title i {
            font-size: 14pt;
        }
        
        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 12px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
            page-break-inside: avoid;
        }
        
        th {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white !important;
            padding: 7px 6px;
            text-align: left;
            font-weight: 700;
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        td {
            padding: 6px 6px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 8pt;
            color: #1f2937;
            background: white;
        }
        
        tr:nth-child(even) td {
            background: #f9fafb !important;
        }
        
        tr:last-child td {
            border-bottom: none;
        }
        
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 7pt;
            font-weight: 700;
            letter-spacing: 0.2px;
        }
        
        .badge-success {
            background: #d1fae5 !important;
            color: #065f46 !important;
            border: 1px solid #10b981;
        }
        
        .badge-warning {
            background: #fef3c7 !important;
            color: #92400e !important;
            border: 1px solid #f59e0b;
        }
        
        .badge-danger {
            background: #fee2e2 !important;
            color: #991b1b !important;
            border: 1px solid #ef4444;
        }
        
        .insights-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            padding: 12px;
            border-radius: 8px;
            border-left: 3px solid #f59e0b;
            margin-bottom: 12px;
            page-break-inside: avoid;
        }
        
        .insights-box h3 {
            margin-top: 0;
            color: #92400e !important;
            font-size: 10pt;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .insights-box ul {
            margin: 6px 0;
            padding-left: 18px;
        }
        
        .insights-box li {
            margin-bottom: 4px;
            line-height: 1.4;
            font-size: 8pt;
            color: #78350f !important;
        }
        
        .no-data {
            padding: 15px;
            text-align: center;
            color: #10b981 !important;
            font-weight: 600;
            background: #d1fae5;
            border-radius: 6px;
            font-size: 8pt;
        }
        
        .info-box {
            background: #f3f4f6;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 12px;
        }
        
        .info-box p {
            margin: 3px 0;
            font-size: 8pt;
        }
        
        .highlight-box {
            background: #eff6ff;
            padding: 10px;
            border-radius: 6px;
            border-left: 3px solid #3b82f6;
            margin-top: 10px;
        }
        
        .highlight-box p {
            margin: 4px 0;
            font-size: 8pt;
        }
    </style>
</head>
<body>
    <div class="print-header">
        <img src="logo2.png" alt="Institute Logo" onerror="this.style.display='none'">
        <h1>CLASS PERFORMANCE</h1>
        <p>CRISPR Year-long Batch 2025-26</p>
        <p><strong>Class Performance Analysis Report</strong></p>
    </div>
    
    <div class="info-box">
        <p><strong>Filter:</strong> ${filterLabel}</p>
        <p><strong>Exams Analyzed:</strong> ${exams.join(', ')}</p>
        <p><strong>Total Exams:</strong> ${stats.totalExams} | <strong>Active Students:</strong> ${stats.activeStudents} / ${stats.totalStudents}</p>
        <p><strong>Generated:</strong> ${currentDate}</p>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <h3><i class="fas fa-chart-line"></i> Class Average</h3>
            <p class="value">${stats.avgPercentage}%</p>
            <p class="sub-value">${stats.totalScore} / ${stats.totalMaxScore}</p>
        </div>
        <div class="stat-card">
            <h3><i class="fas fa-users"></i> Participation</h3>
            <p class="value">${stats.participationRate}%</p>
            <p class="sub-value">${stats.activeStudents} / ${stats.totalStudents} students</p>
        </div>
        <div class="stat-card">
            <h3><i class="fas fa-check-circle"></i> Pass Rate</h3>
            <p class="value">${stats.passRate}%</p>
            <p class="sub-value">${stats.passCount} students ≥60%</p>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title"><i class="fas fa-trophy"></i> Top 5 Performers</div>
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Exams</th>
                    <th>Total Score</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody>
                ${topPerformers.map((student, index) => `
                    <tr>
                        <td><strong>#${index + 1}</strong></td>
                        <td>${student.roll}</td>
                        <td>${student.name}</td>
                        <td>${student.examsAttempted}</td>
                        <td>${student.total} / ${student.maxTotal}</td>
                        <td><span class="badge badge-success">${student.percentage}%</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="section">
        <div class="section-title"><i class="fas fa-exclamation-triangle"></i> Students Needing Attention (&lt;35%)</div>
        ${atRiskStudents.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Roll No</th>
                        <th>Name</th>
                        <th>Exams</th>
                        <th>Total Score</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${atRiskStudents.map(student => `
                        <tr>
                            <td>${student.roll}</td>
                            <td>${student.name}</td>
                            <td>${student.examsAttempted}</td>
                            <td>${student.total} / ${student.maxTotal}</td>
                            <td><span class="badge badge-danger">${student.percentage}%</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<div class="no-data"><i class="fas fa-check-circle"></i> No students below 35%. Excellent class performance!</div>'}
    </div>
    
    <div class="section">
        <div class="section-title"><i class="fas fa-book"></i> Subject-wise Performance</div>
        <table>
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Average %</th>
                    <th>Total Score</th>
                    <th>Highest</th>
                    <th>Lowest</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${Object.keys(subjectStats).map(subKey => {
                    const subject = subjectStats[subKey];
                    const pct = parseFloat(subject.avgPercentage);
                    const badgeClass = pct >= 60 ? 'badge-success' : pct >= 40 ? 'badge-warning' : 'badge-danger';
                    const status = pct >= 60 ? 'Strong' : pct >= 40 ? 'Moderate' : 'Needs Focus';
                    return `
                        <tr>
                            <td><strong>${subject.name}</strong></td>
                            <td><strong>${subject.avgPercentage}%</strong></td>
                            <td>${subject.totalScore} / ${subject.maxScore}</td>
                            <td>${subject.highestScore}</td>
                            <td>${subject.lowestScore}</td>
                            <td><span class="badge ${badgeClass}">${status}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        
        <div class="highlight-box">
            <p><strong><i class="fas fa-star"></i> Strongest Subject:</strong> ${strongest.name} (${strongest.avgPercentage}%)</p>
            <p><strong><i class="fas fa-chart-line"></i> Weakest Subject:</strong> ${weakest.name} (${weakest.avgPercentage}%)</p>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title"><i class="fas fa-clipboard-list"></i> Exam-wise Difficulty Analysis</div>
        <table>
            <thead>
                <tr>
                    <th>Exam</th>
                    <th>Participated</th>
                    <th>Avg Score</th>
                    <th>Average %</th>
                    <th>Highest</th>
                    <th>Lowest</th>
                    <th>Difficulty</th>
                </tr>
            </thead>
            <tbody>
                ${examStats.map(exam => {
                    const pct = parseFloat(exam.avgPercentage);
                    const badgeClass = exam.difficulty === 'Easy' ? 'badge-success' : 
                                      exam.difficulty === 'Moderate' ? 'badge-warning' : 'badge-danger';
                    return `
                        <tr>
                            <td><strong>${exam.name}</strong></td>
                            <td>${exam.studentCount} / ${exam.totalStudents}</td>
                            <td>${exam.avgScore}</td>
                            <td><strong>${exam.avgPercentage}%</strong></td>
                            <td>${exam.highestScore}</td>
                            <td>${exam.lowestScore}</td>
                            <td><span class="badge ${badgeClass}">${exam.difficulty}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="section">
        <div class="insights-box">
            <h3><i class="fas fa-lightbulb"></i> Key Insights & Recommendations</h3>
            <ul>
                ${parseFloat(stats.avgPercentage) >= 60 ? 
                    '<li><strong><i class="fas fa-thumbs-up"></i> Excellent class performance!</strong> Average score of ' + stats.avgPercentage + '% indicates strong understanding.</li>' : 
                    parseFloat(stats.avgPercentage) >= 40 ?
                    '<li><strong><i class="fas fa-info-circle"></i> Moderate performance.</strong> Focus on targeted interventions to improve weak areas.</li>' :
                    '<li><strong><i class="fas fa-exclamation-circle"></i> Performance needs attention.</strong> Consider remedial classes and personalized mentoring.</li>'}
                ${atRiskStudents.length > 5 ? 
                    '<li><strong><i class="fas fa-user-friends"></i> High number of struggling students.</strong> ' + atRiskStudents.length + ' students need immediate support and intervention.</li>' : 
                    atRiskStudents.length > 0 ?
                    '<li><strong><i class="fas fa-user-check"></i> Some students need support.</strong> ' + atRiskStudents.length + ' student(s) require extra attention and practice.</li>' :
                    '<li><strong><i class="fas fa-smile"></i> All students performing well!</strong> No students below 35%. Maintain current teaching approach.</li>'}
                ${parseFloat(strongest.avgPercentage) >= 60 ?
                    '<li><strong><i class="fas fa-medal"></i> Strong subject: ' + strongest.name + '.</strong> Leverage this success to motivate students in weaker areas.</li>' :
                    '<li><strong><i class="fas fa-chart-bar"></i> No subject has strong performance.</strong> Need comprehensive improvement strategy.</li>'}
                ${parseFloat(weakest.avgPercentage) < 40 ?
                    '<li><strong><i class="fas fa-tools"></i> Focus area: ' + weakest.name + '.</strong> Only ' + weakest.avgPercentage + '% average. Implement extra practice sessions.</li>' :
                    '<li><strong><i class="fas fa-balance-scale"></i> Balanced subject performance.</strong> Continue current teaching methodology.</li>'}
                ${parseFloat(stats.participationRate) < 85 ?
                    '<li><strong><i class="fas fa-calendar-check"></i> Low participation rate (' + stats.participationRate + '%).</strong> Encourage regular exam attendance.</li>' :
                    '<li><strong><i class="fas fa-users-cog"></i> Excellent participation (' + stats.participationRate + '%).</strong> Students are engaged and motivated.</li>'}
            </ul>
        </div>
    </div>
  
        <div class="print-footer">
            <p><strong>CRISPR • Year-long Batch 2025–26</strong></p>
            <p>This is an automated report generated by the Student Performance Tracking System</p>
            <p>Generated on ${currentDate} • For queries, contact the academic administration</p>
        </div>
</body>
</html>
    `;
}

// ==============================
// SUBJECT SPECIFIC REPORT MODAL (standalone, no impact on other modals)
// ==============================

// 1. Compute cumulative score info on students (reusable)
function computeSubjectCumulatives() {
  const subjects = ['chem', 'phy', 'bio', 'math'];
  students.forEach(s => {
    s.subjectTotals = { chem:0, phy:0, bio:0, math:0 };
    s.subjectMaxTotals = { chem:0, phy:0, bio:0, math:0 };
    s.exams.forEach(ex => {
      subjects.forEach(sub => {
        s.subjectTotals[sub] += ex[sub] || 0;
        const mk = 'max' + sub.charAt(0).toUpperCase() + sub.slice(1);
        s.subjectMaxTotals[sub] += ex[mk] || 0;
      });
    });
  });
}

// 2. Open subject specific modal (totally separate from everything else)
function openSubjectSpecificModal() {
  // clean up old modal
  let old = document.getElementById('subjectSpecificModal');
  if (old) old.remove();

  // create modal container with identical CSS classes as your normal modal
  const modalHTML = `
    <div id="subjectSpecificModal" class="modal-overlay">
        <div class="modal-container">
            <div class="modal-header">
                <h3 id="printDialogTitle">Subject Specific Report</h3>
                <button class="modal-close" onclick="closeSubjectSpecificModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-content">
                <p>Select filter type for printing:</p>
                <div class="filter-options">
                    <label class="filter-option">
                        <input type="radio" name="printFilter" value="all" checked>
                        <span><i class="fas fa-th"></i> All Subjects</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="printFilter" value="chem">
                        <span><i class="fas fa-flask"></i> Chemistry</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="printFilter" value="phy">
                        <span><i class="fas fa-atom"></i> Physics</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="printFilter" value="bio">
                        <span><i class="fas fa-dna"></i> Biology</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="printFilter" value="math">
                        <span><i class="fas fa-calculator"></i> Mathematics</span>
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="printSelectedSubjectReport()">
                    <i class="fas fa-print"></i>
                    Print
                </button>
            </div>
        </div>
    </div>
  `;

  // Inject modal into body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 3. Close modal function
function closeSubjectSpecificModal() {
  const modal = document.getElementById('subjectSpecificModal');
  if (modal) modal.remove();
}

// 4. Handle Print button inside modal
// 0) Utility: ensure safe access
const _val = (o, path, fallback = 0) => {
  try {
    return path.split('.').reduce((x, k) => (x && x[k] != null ? x[k] : undefined), o) ?? fallback;
  } catch {
    return fallback;
  }
};

// 1) Trigger print from the Subject-Specific modal (supports both legacy and new radio names)
function printSelectedSubjectReport() {
  const sel =
    document.querySelector('#subjectSpecificModal input[name="subjectSpecFilter"]:checked') ||
    document.querySelector('#subjectSpecificModal input[name="printFilter"]:checked');
  const subject = sel ? sel.value : 'all';
  closeSubjectSpecificModal();
  printSubjectSpecificReport(subject);
}

// 2) Compute per-student cumulative subject totals/max (FIXED: read scores from ex.scores and ex.maxScores)
function computeSubjectCumulatives() {
  const subs = ['chem', 'phy', 'bio', 'math'];

  students.forEach(s => {
    // init containers
    s.subjectTotals = s.subjectTotals || {};
    s.subjectMaxTotals = s.subjectMaxTotals || {};
    subs.forEach(sub => {
      s.subjectTotals[sub] = 0;
      s.subjectMaxTotals[sub] = 0;
    });

    // nothing to aggregate
    if (!Array.isArray(s.exams)) return;

    // sum across exams, only when that exam defines a positive max
    s.exams.forEach(ex => {
      subs.forEach(sub => {
        // primary path uses nested structures built from processJsonData
        const score = _val(ex, `scores.${sub}`, _val(ex, sub, 0));
        const max   = _val(ex, `maxScores.${sub}`, _val(ex, `max${sub.charAt(0).toUpperCase()}${sub.slice(1)}`, 0));
        if (max > 0) {
          s.subjectTotals[sub] += score;
          s.subjectMaxTotals[sub] += max;
        }
      });
    });
  });
} // [attached_file:1]

// 3) Open a print window with the generated HTML
function printSubjectSpecificReport(subjectFilter) {
  computeSubjectCumulatives(); // must be called after processJsonData and before computing ranks [attached_file:1]
  const reportData = calculateSubjectSpecificData(subjectFilter); // [attached_file:1]
  const html = generateSubjectSpecificHTML(subjectFilter, reportData); // [attached_file:1]

  const printWindow = window.open('', '', 'width=1200,height=800');
  if (!printWindow) {
    alert('Allow popups for printing.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
} // [attached_file:1]

function calculateSubjectSpecificData(subjectFilter) {
    const subjects = subjectFilter === 'all' ? ['chem', 'phy', 'bio', 'math'] : [subjectFilter];
    
    // Class-level subject stats (from students array converted to flat structure)
    const stats = { totalStudents: students.length, totalExams: examOrder.length, subjects: {} };
    subjects.forEach(sub => {
        let total = 0, maxTotal = 0;
        const maxKey = 'max' + sub.charAt(0).toUpperCase() + sub.slice(1);
        
        // Convert students array to flat structure
        const flatData = students.flatMap(stu => 
            stu.exams.map(ex => ({
                chem: ex.scores.chem,
                phy: ex.scores.phy,
                bio: ex.scores.bio,
                math: ex.scores.math,
                maxChem: ex.maxScores.chem,
                maxPhy: ex.maxScores.phy,
                maxBio: ex.maxScores.bio,
                maxMath: ex.maxScores.math,
                maxTotal: ex.maxTotal
            }))
        );
        
        flatData.forEach(d => {
            if (d.maxTotal > 0 && d[maxKey] > 0) {
                total += (d[sub] || 0);
                maxTotal += (d[maxKey] || 0);
            }
        });
        
        stats.subjects[sub] = {
            name: subjectNames[sub],
            avgPercentage: maxTotal ? ((total / maxTotal) * 100).toFixed(2) : '0.00',
            totalScore: total,
            maxScore: maxTotal
        };
    });
    
    // Student performances
    const studentPerformances = [];
    students.forEach(s => {
        let ok = false, tot = 0, mx = 0;
        const perf = { roll: s.roll, name: s.name, subjects: {} };
        
        subjects.forEach(sub => {
            const st = s.subjectTotals?.[sub] ?? 0;
            const sm = s.subjectMaxTotals?.[sub] ?? 0;
            if (sm > 0) {
                ok = true;
                perf.subjects[sub] = {
                    total: st,
                    max: sm,
                    avgPercent: sm ? ((st / sm) * 100).toFixed(2) : '0.00'
                };
                tot += st;
                mx += sm;
            }
        });
        
        if (ok && mx > 0) {
            perf.overallPercent = ((tot / mx) * 100).toFixed(2);
            perf.overallTotal = tot;
            perf.overallMax = mx;
            studentPerformances.push(perf);
        }
    });
    
    studentPerformances.sort((a, b) => parseFloat(b.overallPercent) - parseFloat(a.overallPercent));
    
    const topPerformers = studentPerformances.slice(0, 5);
    const bottomPerformers = studentPerformances.slice(-5).reverse();
    
    // Exam-wise averages and highs for selected subjects (from students array)
    const examStats = examOrder.map(exam => {
        const row = { name: exam, subjects: {} };
        subjects.forEach(sub => {
            const maxKey = 'max' + sub.charAt(0).toUpperCase() + sub.slice(1);
            let totalSub = 0, maxSub = 0, high = -Infinity;
            
            // Convert students array to flat structure
            const flatData = students.flatMap(stu => 
                stu.exams.map(ex => ({
                    exam: ex.exam,
                    chem: ex.scores.chem,
                    phy: ex.scores.phy,
                    bio: ex.scores.bio,
                    math: ex.scores.math,
                    maxChem: ex.maxScores.chem,
                    maxPhy: ex.maxScores.phy,
                    maxBio: ex.maxScores.bio,
                    maxMath: ex.maxScores.math,
                    maxTotal: ex.maxTotal
                }))
            );
            
            flatData.forEach(d => {
                if (d.exam === exam && d.maxTotal > 0 && d[maxKey] > 0) {
                    totalSub += (d[sub] || 0);
                    maxSub += (d[maxKey] || 0);
                    if ((d[sub] || 0) > high) high = d[sub];
                }
            });
            
            row.subjects[sub] = {
                avgPercent: maxSub ? ((totalSub / maxSub) * 100).toFixed(2) : '0.00',
                highestScore: high === -Infinity ? 0 : high
            };
        });
        return row;
    });
    
    return { stats, studentPerformances, topPerformers, bottomPerformers, examStats };
}

// 5) Generate the subject-specific HTML report for printing (row templates FIXED)
function generateSubjectSpecificHTML(subjectFilter, data) {
  const filterLabel = subjectFilter === 'all' ? 'All Subjects' : (subjectNames[subjectFilter] || subjectFilter.toUpperCase());
  const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const subjects = subjectFilter === 'all' ? ['chem', 'phy', 'bio', 'math'] : [subjectFilter];

  // short labels for compact headers
  const subjectShort = { chem: 'Chem', phy: 'Phy', bio: 'Bio', math: 'Math' };

  // rows (logic unchanged; styling classes only)
  const topRows = (data.topPerformers.length
    ? data.topPerformers.map((s, i) => `
      <tr>
        <td class="text-center"><strong>#${i + 1}</strong></td>
        <td>${s.roll}</td>
        <td>${s.name}</td>
        ${subjects.map(sub => `<td class="num">${s.subjects[sub].avgPercent}%</td>`).join('')}
        <td class="num"><span class="badge badge-success">${s.overallPercent}%</span></td>
      </tr>`).join('')
    : `<tr><td colspan="${subjects.length + 4}" class="empty">No records available for this view.</td></tr>`
  );

  const bottomRows = (data.bottomPerformers.length
    ? data.bottomPerformers.map(s => `
      <tr>
        <td>${s.roll}</td>
        <td>${s.name}</td>
        ${subjects.map(sub => `<td class="num">${s.subjects[sub].avgPercent}%</td>`).join('')}
        <td class="num"><span class="badge badge-danger">${s.overallPercent}%</span></td>
      </tr>`).join('')
    : `<tr><td colspan="${subjects.length + 3}" class="empty positive">No students require support in this view.</td></tr>`
  );

  const allRows = (data.studentPerformances.length
    ? data.studentPerformances.map((s, i) => {
        const pct = parseFloat(s.overallPercent);
        const badge = pct >= 60 ? 'badge-success' : pct >= 40 ? 'badge-warning' : 'badge-danger';
        return `
          <tr>
            <td class="text-center"><strong>${i + 1}</strong></td>
            <td>${s.roll}</td>
            <td>${s.name}</td>
            ${subjects.map(sub => `<td class="num">${s.subjects[sub].avgPercent}%</td>`).join('')}
            <td class="num">${s.overallTotal}/${s.overallMax}</td>
            <td class="num"><span class="badge ${badge}">${s.overallPercent}%</span></td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="${subjects.length + 5}" class="empty">No records available for this view.</td></tr>`
  );

  const examRows = data.examStats.map(e => `
    <tr>
      <td><strong>${e.name}</strong></td>
      ${subjects.map(sub => `<td class="num">${e.subjects[sub].avgPercent}%</td>`).join('')}
      ${subjects.map(sub => `<td class="num">${e.subjects[sub].highestScore}</td>`).join('')}
    </tr>
  `).join('');

  // colgroups: enforce identical widths across all tables
  const makeColgroupTop = () => `
    <colgroup>
      <col class="col-rank"><col class="col-roll"><col class="col-name">
      ${subjects.map(() => `<col class="col-sub">`).join('')}
      <col class="col-overall">
    </colgroup>`;

  const makeColgroupBottom = () => `
    <colgroup>
      <col class="col-roll"><col class="col-name">
      ${subjects.map(() => `<col class="col-sub">`).join('')}
      <col class="col-overall">
    </colgroup>`;

  const makeColgroupAll = () => `
    <colgroup>
      <col class="col-rank"><col class="col-roll"><col class="col-name">
      ${subjects.map(() => `<col class="col-sub">`).join('')}
      <col class="col-total"><col class="col-overall">
    </colgroup>`;

  const makeColgroupExam = () => `
    <colgroup>
      <col class="col-exam">
      ${subjects.map(() => `<col class="col-sub">`).join('')}
      ${subjects.map(() => `<col class="col-sub">`).join('')}
    </colgroup>`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Subject Performance Report — ${filterLabel}</title>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
<style>
/* Print: A4 portrait */
@media print { @page { size: A4 portrait; margin: 10mm } }

/* Keep colors in print */
* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important }

/* Base */
body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 15px; background: #fff; color: #1a1a1a }

/* Header */
.print-header{text-align:center;background:linear-gradient(135deg,#2563eb 0%,#7c3aed 50%,#ec4899 100%);padding:20px;border-radius:10px;margin-bottom:20px;position:relative;overflow:hidden}
.print-header::before{content:'';position:absolute;top:-50%;right:-10%;width:250px;height:250px;background:rgba(255,255,255,0.1);border-radius:50%}
.print-header img{max-width:120px;margin-bottom:8px;position:relative;z-index:2}
.print-header h1{font-size:20pt;font-weight:800;color:#fff!important;margin:6px 0 4px;position:relative;z-index: 2;text-shadow: 2px 2px 4px rgba(0,0,0,0.2);}
.print-header p{font-size:9pt;color:#fff!important;margin:2px 0;font-weight:500;position:relative;z-index: 2;}
/* Footer */
.print-footer { -webkit-print-color-adjust: exact !important;print-color-adjust: exact !important;text-align:center;margin-top: 20px;padding-top: 10px;border-top: 3px solid #3b82f6;color: #6b7280 !important;font-size: 8pt}
@media (max-width: 600px) {
.print-header img { width: 70px}
.print-header h1 { font-size: 16pt}
}

/* Info bar */
.info-box { background: #f3f4f6; padding: 8px; border-radius: 6px; margin-bottom: 8px }
.info-box p { margin: 2px 0; font-size: 7pt }

/* Stats cards */
.stats-grid { display: grid; grid-template-columns: repeat(${subjects.length===1?3:4}, 1fr); gap: 10px; margin-bottom: 8px }
.stat-card { background: linear-gradient(135deg,#f0f4ff,#e0e7ff); padding: 12px; border-radius: 8px; text-align: center; border: 2px solid #cbd5e1 }
.stat-card h3 { margin: 0 0 6px; font-size: 9pt; color: #475569; text-transform: uppercase; font-weight: 600 }
.stat-card .value { font-size: 18pt; font-weight: 700; color: #2563eb }
.stat-card .sub-value { font-size: 7pt; color: #64748b; margin-top: 3px }

/* Sections */
.section { margin-bottom: 12px; page-break-inside: avoid }
.section-title { background: linear-gradient(135deg,#2563eb,#7c3aed); color: #fff !important; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; font-size: 11pt; font-weight: 700; display: flex; align-items: center; gap: 6px }

/* Tables */
table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 6px; overflow: hidden; margin-bottom: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); table-layout: fixed }
th { background: linear-gradient(135deg,#3b82f6,#2563eb); color: #fff !important; padding: 6px 5px; text-align: left; font-weight: 700; font-size: 7pt; text-transform: uppercase; letter-spacing: .2px; white-space: nowrap }
td { padding: 5px; border-bottom: 1px solid #e5e7eb; font-size: 7.2pt; color: #1f2937; background: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
tr:nth-child(even) td { background: #f9fafb !important }
tr:last-child td { border-bottom: none }

/* Column widths: uniform subject % columns, tighter Roll and Score/Max */
.col-rank { width: 6ch }
.col-roll { width: 6ch; text-align:center}       /* decreased from 10ch */
.col-name { width: auto; text-align:center }
.col-sub { width: 7ch; text-align:center}
.col-total { width: 10ch; text-align:center}      /* decreased from 16ch */
.col-overall { width: 9ch; text-align:center}
.col-exam { width: 12ch; text-align:center}
/* Alignment helpers */
.text-center { text-align: center }
.num { text-align: right; font-variant-numeric: tabular-nums }

/* Empty-state messaging */
.empty { text-align: center; color: #6b7280; padding: 10px 0 }
.empty.positive { color: #10b981 }

/* Badges */
.badge { display: inline-block; padding: 2px 6px; border-radius: 8px; font-size: 6pt; font-weight: 700 }
.badge-success { background: #d1fae5 !important; color: #065f46 !important; border: 1px solid #10b981 }
.badge-warning { background: #fef3c7 !important; color: #92400e !important; border: 1px solid #f59e0b }
.badge-danger { background: #fee2e2 !important; color: #991b1b !important; border: 1px solid #ef4444 }

</style></head><body>

<div class="print-header">
  <img src="logo2.png" onerror="this.style.display='none'">
  <h1>SUBJECT ANALYSIS</h1>
  <p>CRISPR Year-long Batch 2025–26</p>
  <p><strong>Subject Performance Report</strong></p>
</div>

<div class="info-box">
  <p><strong>View:</strong> ${filterLabel} &nbsp; | &nbsp; <strong>Students:</strong> ${data.stats.totalStudents} &nbsp; | &nbsp; <strong>Assessments:</strong> ${data.stats.totalExams} &nbsp; | &nbsp; <strong>Date:</strong> ${currentDate}</p>
</div>

<!-- Stats Cards -->
<div class="stats-grid">
  ${subjects.map(sub => {
    const s = data.stats.subjects[sub];
    const icon = sub==='chem'?'flask':sub==='phy'?'atom':sub==='bio'?'dna':'calculator';
    return `<div class="stat-card">
      <h3><i class="fas fa-${icon}"></i> ${s.name}</h3>
      <p class="value">${s.avgPercentage}%</p>
      <p class="sub-value">Cumulative: ${s.totalScore}/${s.maxScore}</p>
    </div>`;
  }).join('')}
</div>

<!-- Top 5 -->
<div class="section">
  <div class="section-title"><i class="fas fa-trophy"></i> Top 5 Performers</div>
  <table>
    ${makeColgroupTop()}
    <thead>
      <tr>
        <th class="col-rank text-center">Rank</th>
        <th class="col-roll text-center">Roll</th>
        <th class="col-name">Name</th>
        ${subjects.map(s => `<th class="col-sub text-center" title="${subjectNames[s]}">${({chem:'Chem',phy:'Phys',bio:'Bio',math:'Math'})[s]} %</th>`).join('')}
        <th class="col-overall text-center">Overall %</th>
      </tr>
    </thead>
    <tbody>${topRows}</tbody>
  </table>
</div>

<!-- Needs Support -->
<div class="section">
  <div class="section-title"><i class="fas fa-hands-helping"></i> Needs Support</div>
  <table>
    ${makeColgroupBottom()}
    <thead>
      <tr>
        <th class="col-roll text-center">Roll</th>
        <th class="col-name">Name</th>
        ${subjects.map(s => `<th class="col-sub text-center" title="${subjectNames[s]}">${({chem:'Chem',phy:'Phys',bio:'Bio',math:'Math'})[s]} %</th>`).join('')}
        <th class="col-overall text-center">Overall %</th>
      </tr>
    </thead>
    <tbody>${bottomRows}</tbody>
  </table>
</div>

<!-- All Students -->
<div class="section">
  <div class="section-title"><i class="fas fa-users"></i> All Students</div>
  <table>
    ${makeColgroupAll()}
    <thead>
      <tr>
        <th class="col-rank text-center">Rank</th>
        <th class="col-roll text-center">Roll</th>
        <th class="col-name">Name</th>
        ${subjects.map(s => `<th class="col-sub text-center" title="${subjectNames[s]}">${({chem:'Chem',phy:'Phys',bio:'Bio',math:'Math'})[s]} %</th>`).join('')}
        <th class="col-total text-center">Score/Max</th>
        <th class="col-overall text-center">Overall %</th>
      </tr>
    </thead>
    <tbody>${allRows}</tbody>
  </table>
</div>

<!-- Assessment Summary -->
<div class="section">
  <div class="section-title"><i class="fas fa-clipboard-list"></i> Assessment Summary</div>
  <table>
    ${makeColgroupExam()}
    <thead>
      <tr>
        <th class="col-exam">Exam</th>
        ${subjects.map(s => `<th class="col-sub text-center" title="${subjectNames[s]} Avg">${({chem:'Chem',phy:'Phys',bio:'Bio',math:'Math'})[s]} Avg %</th>`).join('')}
        ${subjects.map(s => `<th class="col-sub text-center" title="${subjectNames[s]} High">${({chem:'Chem',phy:'Phys',bio:'Bio',math:'Math'})[s]} High</th>`).join('')}
      </tr>
    </thead>
    <tbody>${examRows}</tbody>
  </table>
</div>

        <div class="print-footer">
            <p><strong>CRISPR • Year-long Batch 2025–26</strong></p>
            <p>This is an automated report generated by the Student Performance Tracking System</p>
            <p>Generated on ${currentDate} • For queries, contact the academic administration</p>
        </div>

</body></html>`;
}

// ============================================
// PROGRESS TRACKING REPORT - FULLY FIXED FOR BACKEND
// ============================================

// 1. Open modal to select student
function openStudentSelectionModal(mode) {
    if (mode !== 'progress') return;
    
    ensureProgressModal();
    populateProgressStudentDropdown();
    
    const modal = document.getElementById('progressTrackingModal');
    if (modal) modal.style.display = 'flex';
}

// 2. Close modal
function closeStudentSelectionModal() {
    const modal = document.getElementById('progressTrackingModal');
    if (modal) modal.style.display = 'none';
}

// 3. Build modal (only once)
function ensureProgressModal() {
    if (document.getElementById('progressTrackingModal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'progressTrackingModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);display:none;align-items:center;justify-content:center;z-index:9999';
    modal.innerHTML = `
        <div class="modal-content" style="background:#fff;border-radius:10px;min-width:420px;max-width:560px;box-shadow:0 10px 30px rgba(0,0,0,.2);overflow:hidden">
            <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff">
                <h3 style="margin:0;font-size:16px;font-weight:700"><i class="fas fa-user-clock"></i> Progress Tracking Report</h3>
                <button class="close-btn" id="progressCloseBtn" title="Close" style="background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer">&times;</button>
            </div>
            <div class="modal-body" style="padding:16px">
                <label for="progressStudentSelect" class="modal-label" style="display:block;font-size:12px;color:#475569;margin-bottom:6px">Select Student Roll</label>
                <select id="progressStudentSelect" class="modal-select" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font-size:14px">
                    <option value="">Select a student</option>
                </select>
            </div>
            <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding:12px 16px;background:#f8fafc">
                <button id="progressCancelBtn" class="btn" style="padding:8px 12px;border:none;border-radius:6px;cursor:pointer;background:#e5e7eb;color:#111827">Cancel</button>
                <button id="progressPrintBtn" class="btn" style="padding:8px 12px;border:none;border-radius:6px;cursor:pointer;background:#16a34a;color:#fff"><i class="fas fa-print"></i> Print</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('progressCloseBtn').addEventListener('click', closeStudentSelectionModal);
    document.getElementById('progressCancelBtn').addEventListener('click', closeStudentSelectionModal);
    document.getElementById('progressPrintBtn').addEventListener('click', () => {
        const sel = document.getElementById('progressStudentSelect');
        const roll = sel?.value;
        if (!roll) {
            alert('Please select a student.');
            return;
        }
        const student = students.find(s => s.roll === roll);
        if (!student) {
            alert('Student not found.');
            return;
        }
        printProgressTrackingReport(student);
        closeStudentSelectionModal();
    });
}

// 4. Populate dropdown with students
function populateProgressStudentDropdown() {
    const select = document.getElementById('progressStudentSelect');
    if (!select) return;
    
    const sorted = [...students].sort((a, b) => 
        a.roll.localeCompare(b.roll, undefined, { numeric: true, sensitivity: 'base' })
    );
    
    select.innerHTML = '<option value="">Select a student</option>';
    for (const s of sorted) {
        const opt = document.createElement('option');
        opt.value = s.roll;
        opt.textContent = `${s.name} (${s.roll})`;
        select.appendChild(opt);
    }
}

// 5. Print progress report
function printProgressTrackingReport(student) {
    if (typeof computeSubjectCumulatives === 'function') computeSubjectCumulatives();
    
    const html = generateProgressTrackingHTML(student);
    const w = window.open('', '', 'width=1200,height=800');
    if (!w) {
        alert('Allow popups for printing.');
        return;
    }
    w.document.write(html);
    w.document.close();
    w.onload = () => setTimeout(() => w.print(), 500);
}

/* Helpers for metrics */
const _safe = (o, p, d=0) => {
  try { return p.split('.').reduce((x,k)=> (x && x[k]!=null? x[k]:undefined), o) ?? d; } catch { return d; }
};
const SUBJECTS = ['chem','phy','bio','math'];
const SHORT = { chem:'Chem', phy:'Phy', bio:'Bio', math:'Math' };
const FULL  = { chem:'CHEMISTRY', phy:'PHYSICS', bio:'BIOLOGY', math:'MATHEMATICS' };

/* Build the printable HTML */
// Replace your current generateProgressTrackingHTML with this version
function generateProgressTrackingHTML(stu) {
  const SUBJECTS = ['chem','phy','bio','math'];
  const SHORT = { chem:'Chem', phy:'Phy', bio:'Bio', math:'Math' };
  const FULL  = { chem:'CHEMISTRY', phy:'PHYSICS', bio:'BIOLOGY', math:'MATHEMATICS' };
  const _safe = (o, p, d=0) => { try { return p.split('.').reduce((x,k)=> (x && x[k]!=null? x[k]:undefined), o) ?? d; } catch { return d; } };

  // Valid exams in configured order
  const valid = (stu.exams || []).filter(ex => (_safe(ex,'maxTotal',0) > 0));
  const byOrder = [...valid].sort((a,b) => examOrder.indexOf(a.exam) - examOrder.indexOf(b.exam));

  // Exam-wise score + % + rank
  const examRowsData = byOrder.map(ex => {
    const subPct = {}, subScore = {}, subMax = {};
    let tScore=0, tMax=0;
    SUBJECTS.forEach(s => {
      const sc = _safe(ex, `scores.${s}`, _safe(ex, s, 0));
      const mx = _safe(ex, `maxScores.${s}`, _safe(ex, `max${s.charAt(0).toUpperCase()}${s.slice(1)}`, 0));
      subScore[s] = sc; subMax[s] = mx; subPct[s] = mx>0 ? (sc/mx*100) : 0;
      tScore += sc; tMax += mx;
    });
    const overallPct = tMax>0 ? +(tScore/tMax*100).toFixed(2) : 0;

    // FIXED: Get cohort data from students array, not sampleData
    const cohort = students.flatMap(s => 
        s.exams
            .filter(e => e.exam === ex.exam && e.maxTotal > 0)
            .map(e => ({
                roll: s.roll,
                percent: e.percent != null ? e.percent : (e.maxTotal > 0 ? (e.total / e.maxTotal * 100) : 0)
            }))
    );
    const sorted = cohort.map(d => ({ roll:d.roll, percent:(d.percent!=null? d.percent : (d.maxTotal>0? (d.total/d.maxTotal*100):0)) }))
                         .sort((a,b)=> b.percent - a.percent);
    const idx = sorted.findIndex(e => e.roll === stu.roll);
    const rank = idx >= 0 ? (idx+1) : '-';

    return { exam: ex.exam, subPct, subScore, subMax, overallPct, totalScore:tScore, totalMax:tMax, rank };
  });

  // Subject cumulatives
  const subjAgg = SUBJECTS.reduce((acc,s)=>{
    let sc=0,mx=0,best={exam:'-',pct:-Infinity},worst={exam:'-',pct:Infinity};
    byOrder.forEach(ex=>{
      const c=_safe(ex,`scores.${s}`,_safe(ex,s,0)); const M=_safe(ex,`maxScores.${s}`,_safe(ex,`max${s.charAt(0).toUpperCase()}${s.slice(1)}`,0));
      if(M>0){ sc+=c; mx+=M; const p=(c/M*100); if(p>best.pct) best={exam:ex.exam,pct:p}; if(p<worst.pct) worst={exam:ex.exam,pct:p}; }
    });
    acc[s]={ total:sc, max:mx, avgPct: mx>0? +(sc/mx*100).toFixed(2):0,
             best:{exam:best.exam,pct:isFinite(best.pct)? +best.pct.toFixed(2):0},
             worst:{exam:worst.exam,pct:isFinite(worst.pct)? +worst.pct.toFixed(2):0} };
    return acc;
  },{});

  // Overall + trend/consistency
  const overall = Object.values(subjAgg).reduce((o,v)=>({score:o.score+v.total,max:o.max+v.max}),{score:0,max:0});
  const overallPct = overall.max>0? +(overall.score/overall.max*100).toFixed(2):0;
  const last3 = examRowsData.slice(-3);
  const trend = last3.length>=2 ? +(last3[last3.length-1].overallPct - last3[0].overallPct).toFixed(2) : 0;
  const trendWord = trend>0 ? 'Upward' : trend<0 ? 'Downward' : 'Stable';
  const trendArrow = trend>0 ? '▲' : trend<0 ? '▼' : '■';
  const mean = examRowsData.length? examRowsData.reduce((a,x)=>a+x.overallPct,0)/examRowsData.length : 0;
  const variance = examRowsData.length? examRowsData.reduce((a,x)=>a+Math.pow(x.overallPct-mean,2),0)/examRowsData.length : 0;
  const stdOverall = +Math.sqrt(variance).toFixed(2);
  const subjectAvgs = SUBJECTS.map(s=>subjAgg[s].avgPct);
  const meanS = subjectAvgs.length? subjectAvgs.reduce((a,x)=>a+x,0)/subjectAvgs.length:0;
  const varS = subjectAvgs.length? subjectAvgs.reduce((a,x)=>a+Math.pow(x-meanS,2),0)/subjectAvgs.length:0;
  const stdSubjects = +Math.sqrt(varS).toFixed(2);
  const latest = examRowsData[examRowsData.length-1] || { exam:'-', overallPct:0 };

  // Subject cards
  const subjectsGrid = SUBJECTS.map(s=>{
    const a = subjAgg[s];
    return `
      <div class="stat-card">
        <h3><i class="fas fa-${s==='chem'?'flask':s==='phy'?'atom':s==='bio'?'dna':'calculator'}"></i> ${FULL[s]}</h3>
        <p class="value">${a.avgPct}%</p>
        <p class="sub-value">Score/Max: ${a.total}/${a.max}</p>
        <p class="mini">Best: ${a.best.exam} • ${a.best.pct}%</p>
        <p class="mini">Scope: ${a.worst.exam} • ${a.worst.pct}%</p>
      </div>
    `;
  }).join('');

  // Exam rows: score|% pills
  const examRowsHTML = examRowsData.map(r => {
    const overallCls = r.overallPct>=60?'pill-green': r.overallPct>=40?'pill-amber':'pill-red';
    return `
      <tr>
        <td><strong>${r.exam}</strong></td>
        ${SUBJECTS.map(s=> {
          const pct = r.subPct[s], score = r.subScore[s];
          const cls = pct>=60?'pill-green': pct>=40?'pill-amber':'pill-red';
          return `<td class="num"><span class="score-strong">${score}</span> | <span class="pill ${cls}">${pct.toFixed(2)}%</span></td>`;
        }).join('')}
        <td class="num"><span class="score-strong">${r.totalScore}</span> | <span class="pill ${overallCls}">${r.overallPct}%</span></td>
        <td class="num"><span class="rank-pill">#${r.rank}</span></td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="7" class="empty">No qualified assessments.</td></tr>`;

  // Metric pill classes for Consistency & Trend
  const sigmaClass   = stdOverall  <= 7 ? 'metric-green' : stdOverall  <= 12 ? 'metric-amber' : 'metric-red';
  const spreadClass  = stdSubjects <= 8 ? 'metric-green' : stdSubjects <= 12 ? 'metric-amber' : 'metric-red';
  const trendClass   = trend > 0 ? 'metric-green' : trend < 0 ? 'metric-red' : 'metric-blue';
  const last3HTML    = last3.length ? last3.map(x=>`<span class="metric-chip">${x.overallPct.toFixed(2)}%</span>`).join('<span class="sp">•</span>') : '-';

  const currentDate = new Date().toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' });

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Progress Report — ${stu.name} (${stu.roll})</title>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
<style>
@media print { @page { size: A4 portrait; margin: 10mm } }
*{ -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important }
body{font-family:'Segoe UI',sans-serif;margin:0;padding:15px;background:#fff;color:#1a1a1a}

/* Header */
.print-header{text-align:center;background:linear-gradient(135deg,#2563eb 0%,#7c3aed 50%,#ec4899 100%);padding:20px;border-radius:10px;margin-bottom:20px;position:relative;overflow:hidden}
.print-header::before{content:'';position:absolute;top:-50%;right:-10%;width:250px;height:250px;background:rgba(255,255,255,0.1);border-radius:50%}
.print-header img{max-width:120px;margin-bottom:8px;position:relative;z-index:2}
.print-header h1{font-size:20pt;font-weight:800;color:#fff!important;margin:6px 0 4px;position:relative;z-index: 2;text-shadow: 2px 2px 4px rgba(0,0,0,0.2);}
.print-header p{font-size:9pt;color:#fff!important;margin:2px 0;font-weight:500;position:relative;z-index: 2;}

/* Identity banner */
.identity-card{display:flex;gap:16px;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#eef2ff,#f5f3ff);border:2px solid #c7d2fe;border-radius:10px;padding:12px 14px;margin-bottom:10px}
.id-left{min-width:0}
.student-name{font-size:22pt;font-weight:800;letter-spacing:.2px;color:#1f2937;line-height:1.1}
.student-roll{font-size:10pt;color:#475569;margin-top:4px}
.chips{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap}
.chip{background:#e2e8f0;color:#334155;border:1px solid #cbd5e1;border-radius:999px;padding:2px 8px;font-size:8pt;font-weight:600}
.id-kpis{display:grid;grid-template-columns:repeat(4,auto);gap:10px;align-items:stretch}
.kpi{background:#ffffff;border:2px solid #e5e7eb;border-radius:10px;padding:8px 10px;min-width:70px;text-align:center}
.kpi-label{font-size:8pt;color:#6b7280;text-transform:uppercase;letter-spacing:.3px}
.kpi-value{font-size:14pt;font-weight:800;color:#1f2937;line-height:1.1}
.kpi.trend .kpi-value.positive{color:#065f46}
.kpi.trend .kpi-value.negative{color:#991b1b}

/* Sections/cards */
.section{margin-bottom:12px;page-break-inside:avoid}
.section-title{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff!important;padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:11pt;font-weight:700;display:flex;align-items:center;gap:6px}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:8px}
.stat-card{background:linear-gradient(135deg,#f0f4ff,#e0e7ff);padding:12px;border-radius:8px;text-align:center;border:2px solid #cbd5e1}
.stat-card h3{margin:0 0 6px;font-size:9pt;color:#475569;text-transform:uppercase;font-weight:600}
.stat-card .value{font-size:18pt;font-weight:700;color:#2563eb}
.stat-card .sub-value{font-size:7pt;color:#64748b;margin-top:3px}
.stat-card .mini{font-size:7pt;color:#475569;margin:2px 0}

/* Identity banner: two-column split (left info, right KPIs) */
.identity-card{
  display:grid;
  grid-template-columns: 1.6fr 1fr;   /* left wider for name/meta, right for KPIs */
  column-gap:16px;
  align-items:stretch;
  background:linear-gradient(135deg,#eef2ff,#f5f3ff);
  border:2px solid #c7d2fe;
  border-radius:10px;
  padding:12px 14px;
  margin-bottom:10px;
}
.id-left{ min-width:0; }

/* Slightly smaller name for better balance */
.student-name{
  font-size:18pt;          /* was ~19–22pt */
  font-weight:800;
  letter-spacing:.2px;
  color:#1f2937;
  line-height:1.1;
}
.student-roll{ font-size:10pt; color:#475569; margin-top:4px; }
.chips{ margin-top:6px; display:flex; gap:6px; flex-wrap:wrap; }
.chip{
  background:#e2e8f0; color:#334155; border:1px solid #cbd5e1;
  border-radius:999px; padding:2px 8px; font-size:8pt; font-weight:600;
}

/* KPI block: fixed 2×2 grid on the right – stays beside the name */
.id-kpis{
  display:grid;
  grid-template-columns: repeat(2, minmax(120px,1fr));
  grid-auto-rows:auto;
  gap:10px;
  align-content:start;
  justify-items:stretch;
  /* lock a sensible min width so it doesn't wrap under the name */
  min-width:260px;
}

/* KPI cards */
.kpi{
  background:#ffffff;
  border:2px solid #e5e7eb;
  border-radius:10px;
  padding:10px 12px;
  text-align:center;
  display:flex;
  flex-direction:column;
  justify-content:center;
}
.kpi-label{
  font-size:8pt; color:#6b7280; text-transform:uppercase; letter-spacing:.3px;
}
.kpi-value{
  font-size:14pt; font-weight:800; color:#1f2937; line-height:1.1;
}
.kpi.trend .kpi-value.positive{ color:#065f46; }
.kpi.trend .kpi-value.negative{ color:#991b1b; }

/* Print and very narrow safety: keep side-by-side unless extremely tight */
@media print {
  .identity-card{ grid-template-columns: 1.6fr 1fr; }
}
@media screen and (max-width: 820px){
  .identity-card{ grid-template-columns: 1fr; }   /* only collapse on very small screens */
  .id-kpis{ min-width:0; grid-template-columns:repeat(2,1fr); }
}


/* Tables */
table{width:100%;border-collapse:separate;border-spacing:0;border-radius:6px;overflow:hidden;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);table-layout:fixed}
th{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff!important;padding:6px 5px;text-align:left;font-weight:700;font-size:7pt;text-transform:uppercase;letter-spacing:.2px;white-space:nowrap}
td{padding:5px;border-bottom:1px solid #e5e7eb;font-size:7.2pt;color:#1f2937;background:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:nth-child(even) td{background:#f9fafb!important}
tr:last-child td{border-bottom:none}
.col-exam{width:10ch}
.col-sub{width:10ch}
.col-overall{width:12ch}
.col-rank{width:5ch}
.num{text-align:right;font-variant-numeric:tabular-nums}
.empty{text-align:center;color:#6b7280;padding:10px 0}

/* Emphasis pills for timeline */
.score-strong{font-weight:800;color:#111827}
.pill{display:inline-block;padding:1px 6px;border-radius:999px;border:1px solid transparent;font-weight:700;font-size:6.8pt}
.pill-green{background:#d1fae5;color:#065f46;border-color:#10b981}
.pill-amber{background:#fef3c7;color:#92400e;border-color:#f59e0b}
.pill-red{background:#fee2e2;color:#991b1b;border-color:#ef4444}
.rank-pill{display:inline-block;background:#e0e7ff;color:#1e3a8a;border:1px solid #93c5fd;border-radius:999px;padding:1px 6px;font-weight:800}

/* NEW: Metric pills for Consistency & Trend */
.metric-pill{display:inline-block;padding:2px 10px;border-radius:999px;border:1px solid transparent;font-weight:800;font-size:8pt}
.metric-green{background:#d1fae5;color:#065f46;border-color:#10b981}
.metric-amber{background:#fef3c7;color:#92400e;border-color:#f59e0b}
.metric-red{background:#fee2e2;color:#991b1b;border-color:#ef4444}
.metric-blue{background:#e0f2fe;color:#075985;border-color:#7dd3fc}
.metric-chip{display:inline-block;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:999px;padding:2px 8px;font-weight:700;font-size:7.2pt}
.sp{padding:0 6px;color:#94a3b8}

/* Footer */
.print-footer { -webkit-print-color-adjust: exact !important;print-color-adjust: exact !important;text-align:center;margin-top: 20px;padding-top: 10px;border-top: 3px solid #3b82f6;color: #6b7280 !important;font-size: 8pt}
@media (max-width: 600px) {
.print-header img { width: 70px}
.print-header h1 { font-size: 16pt}
}
</style></head><body>


<div class="print-header">
  <img src="logo2.png" onerror="this.style.display='none'">
  <h1>PROGRESS REPORT</h1>
  <p>CRISPR Year-long Batch 2025–26</p>
  <p><strong>Progress Tracking Report</strong></p>
</div>

<!-- Identity banner -->
<div class="identity-card">
  <div class="id-left">
    <div class="student-name">${stu.name}</div>
    <div class="student-roll">Roll: ${stu.roll}</div>
    <div class="chips">
      <span class="chip">Progress Tracking</span>
      <span class="chip">Generated: ${currentDate}</span>
      <span class="chip">Assessments: ${byOrder.length}</span>
    </div>
  </div>
  <div class="id-kpis">
    <div class="kpi">
      <div class="kpi-label">Overall</div>
      <div class="kpi-value">${overallPct}%</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Latest</div>
      <div class="kpi-value" title="${(examRowsData[examRowsData.length-1]||{}).exam || '-'}">${(examRowsData[examRowsData.length-1]||{overallPct:0}).overallPct}%</div>
    </div>
    <div class="kpi trend">
      <div class="kpi-label">Trend (L3)</div>
      <div class="kpi-value ${trend>0?'positive':trend<0?'negative':''}">${trendArrow} ${trend>=0?'+':''}${trend}%</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Consistency</div>
      <div class="kpi-value" title="Std Dev Overall %">σ ${stdOverall}</div>
    </div>
  </div>
</div>

<!-- Subject Averages -->
<div class="section">
  <div class="section-title"><i class="fas fa-flask"></i> Subject Averages</div>
  <div class="stats-grid">${subjectsGrid}</div>
</div>

<!-- Exam Timeline -->
<div class="section">
  <div class="section-title"><i class="fas fa-timeline"></i> Exam Timeline</div>
  <table>
    <colgroup>
      <col class="col-exam">
      ${SUBJECTS.map(()=>'<col class="col-sub">').join('')}
      <col class="col-overall">
      <col class="col-rank">
    </colgroup>
    <thead>
      <tr>
        <th>Exam</th>
        ${SUBJECTS.map(s=>`<th title="${FULL[s]}">${SHORT[s]} score|%</th>`).join('')}
        <th>Overall score|%</th>
        <th>Rank</th>
      </tr>
    </thead>
    <tbody>${examRowsHTML}</tbody>
  </table>
</div>

<!-- Consistency & Trend with metric pills -->
<div class="section">
  <div class="section-title"><i class="fas fa-chart-line"></i> Consistency & Trend</div>
  <table>
    <colgroup><col style="width:30ch"><col style="width:auto"></colgroup>
    <tbody>
      <tr>
        <td>Overall Consistency (Std Dev of Overall %)</td>
        <td class="num"><span class="metric-pill ${sigmaClass}">σ ${stdOverall}</span></td>
      </tr>
      <tr>
        <td>Subject Spread (Std Dev of Subject Averages)</td>
        <td class="num"><span class="metric-pill ${spreadClass}">σ ${stdSubjects}</span></td>
      </tr>
      <tr>
        <td>Last 3 Overall %</td>
        <td class="num">${last3HTML}</td>
      </tr>
      <tr>
        <td>Direction</td>
        <td class="num"><span class="metric-pill ${trendClass}">${trendArrow} ${trend>=0?'+':''}${trend}% (${trendWord})</span></td>
      </tr>
    </tbody>
  </table>
</div>

<div class="print-footer">
    <p><strong>CRISPR • Year-long Batch 2025–26</strong></p>
    <p>This is an automated report generated by the Student Performance Tracking System</p>
    <p>Generated on ${currentDate} • For queries, contact the academic administration</p>
</div>


</body></html>`;
}


// Footer functionality
function updateFooterStats() {
    try {
        // Update student count
        const studentCount = students.length;
        const footerStudentElement = document.getElementById('footerStudentCount');
        if (footerStudentElement) {
            footerStudentElement.textContent = studentCount + ' Students';
        }
        
        // Update exam count
        const uniqueExams = [...new Set(students.flatMap(s => s.exams.map(e => e.exam)))];
        const examCount = uniqueExams.filter(e => 
            students.some(s => s.exams.some(ex => ex.exam === e && ex.maxTotal > 0))
        ).length;
        const footerExamElement = document.getElementById('footerExamCount');
        if (footerExamElement) {
            footerExamElement.textContent = examCount + ' Exams';
        }
        
        // Update last updated time
        const lastUpdatedElement = document.querySelector('.lastUpdated');
        if (lastUpdatedElement) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const timeStr = now.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            lastUpdatedElement.textContent = `${dateStr} ${timeStr}`;
        }
        
        // Update total records
        const totalRecordsElement = document.querySelector('.totalRecords');
        if (totalRecordsElement) {
            const totalRecords = students.reduce((sum, s) => sum + s.exams.length, 0);
            totalRecordsElement.textContent = totalRecords;
        }
        
        // Update system status (always online if we got here)
        const statusOnline = document.querySelector('.status-online');
        if (statusOnline) {
            statusOnline.textContent = 'Online';
            statusOnline.style.color = '#10b981';
        }
        
        console.log('✅ Footer stats updated:', {
            students: studentCount,
            exams: examCount,
            records: students.reduce((sum, s) => sum + s.exams.length, 0)
        });
        
    } catch (error) {
        console.error('❌ Footer update error:', error);
    }
}

// Auto-refresh footer every 30 seconds
setInterval(updateFooterStats, 30000);

// Refresh all data function
function refreshAllData() {
    showLoading();
    
    // Re-fetch data from backend
    fetchStudentData().then(() => {
        updateFooterStats();
        showStatus('Data refreshed successfully!', 'success');
    }).catch(error => {
        showStatus('Failed to refresh: ' + error.message, 'error');
    }).finally(() => {
        hideLoading();
    });
}

// ============================================
// AUTO-UPDATE HEADER AND FOOTER STATS
// ============================================

function updateHeaderAndFooterStats() {
    try {
        // Calculate student count
        const studentCount = students.length;
        
        // Calculate exam count (only exams with data)
        const uniqueExams = [...new Set(students.flatMap(s => s.exams.map(e => e.exam)))];
        const examCount = uniqueExams.filter(e => 
            students.some(s => s.exams.some(ex => ex.exam === e && ex.maxTotal > 0))
        ).length;
        
        // Update HEADER stats
        const headerStudentStat = document.querySelector('.header-stats .stat-pill:nth-child(1) span');
        if (headerStudentStat) {
            headerStudentStat.textContent = `${studentCount} Students`;
        }
        
        const headerExamStat = document.querySelector('.header-stats .stat-pill:nth-child(2) span');
        if (headerExamStat) {
            headerExamStat.textContent = `${examCount} Exams`;
        }
        
        // Update FOOTER stats
        const footerStudentCount = document.getElementById('footerStudentCount');
        if (footerStudentCount) {
            footerStudentCount.textContent = `${studentCount} Students`;
        }
        
        const footerExamCount = document.getElementById('footerExamCount');
        if (footerExamCount) {
            footerExamCount.textContent = `${examCount} Exams`;
        }
        
        // Update last updated time
        const lastUpdatedElements = document.querySelectorAll('.lastUpdated');
        lastUpdatedElements.forEach(el => {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const timeStr = now.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            el.textContent = `${dateStr} ${timeStr}`;
        });
        
        // Update total records
        const totalRecordsElements = document.querySelectorAll('.totalRecords');
        const totalRecords = students.reduce((sum, s) => sum + s.exams.length, 0);
        totalRecordsElements.forEach(el => {
            el.textContent = totalRecords;
        });
        
        // Update system status
        const statusElements = document.querySelectorAll('.status-online');
        statusElements.forEach(el => {
            el.textContent = 'Online';
            el.style.color = '#10b981';
        });
        
        console.log('✅ Header & Footer updated:', {
            students: studentCount,
            exams: examCount,
            totalRecords: totalRecords
        });
        
    } catch (error) {
        console.error('❌ Header/Footer update error:', error);
    }
}

// Auto-refresh every 30 seconds
setInterval(updateHeaderAndFooterStats, 30000);

/* ========================================
   EXAM RANKLIST - THEME COLOR WRAPPER (PRINT-SAFE)
   Adds theme picker + colored header/footer
   Keeps existing table layout/styles intact
   FIXED: Colors now print correctly (not white)
   ======================================== */

(function() {
  // Store original openPrintWindow
  const originalOpenPrintWindow = window.openPrintWindow;
  
  // Override to inject theme picker
  window.openPrintWindow = function(title, content) {
    // Show theme modal instead of printing directly
    showThemePickerModal(title, content);
  };

  // Theme modal HTML (lightweight, no conflicts)
  function showThemePickerModal(title, tableHtml) {
    // Remove old modal if exists
    let modal = document.getElementById('ranklistThemePickerModal');
    if (modal) modal.remove();

    // Create modal
    modal = document.createElement('div');
    modal.id = 'ranklistThemePickerModal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.5); display: flex; align-items: center; 
      justify-content: center; z-index: 10000; font-family: 'Segoe UI', sans-serif;
    `;
    modal.innerHTML = `
      <div style="background: white; border-radius: 12px; width: 90%; max-width: 520px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 700;"><i class="fas fa-palette"></i> Select Print Theme</h3>
          <button onclick="document.getElementById('ranklistThemePickerModal').remove()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; line-height: 1;">&times;</button>
        </div>
        <div style="padding: 20px;">
          <p style="margin: 0 0 16px; color: #374151; font-size: 14px;">Choose color theme (table layout unchanged):</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
            ${['classic', 'minimal', 'sunset', 'azure', 'emerald'].map((theme, i) => `
              <label style="display: flex; align-items: center; gap: 8px; padding: 12px; border: 2px solid ${i === 0 ? '#4f46e5' : '#d1d5db'}; border-radius: 8px; cursor: pointer; background: ${i === 0 ? '#f0f4ff' : 'white'}; transition: all 0.2s;">
                <input type="radio" name="rankTheme" value="${theme}" ${i === 0 ? 'checked' : ''} style="margin: 0; width: 18px; height: 18px; cursor: pointer;">
                <span style="font-weight: 600; color: #111827; font-size: 14px;">${theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div style="padding: 16px; background: #f9fafb; display: flex; justify-content: flex-end; gap: 12px;">
          <button onclick="document.getElementById('ranklistThemePickerModal').remove()" style="padding: 10px 20px; border: none; border-radius: 6px; background: #e5e7eb; color: #374151; cursor: pointer; font-weight: 500; font-size: 14px;">Cancel</button>
          <button id="confirmRanklistPrint" style="padding: 10px 20px; border: none; border-radius: 6px; background: #10b981; color: white; cursor: pointer; font-weight: 500; font-size: 14px;">
            <i class="fas fa-print"></i> Print
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Handle print confirmation
    document.getElementById('confirmRanklistPrint').onclick = () => {
      const selectedTheme = document.querySelector('input[name="rankTheme"]:checked').value || 'classic';
      modal.remove();
      printWithTheme(title, tableHtml, selectedTheme);
    };
  }

  // Theme colors (only these are applied; everything else from your CSS)
  function getThemeColors(theme) {
    const themes = {
      classic: {
        headerBg: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #ec4899 100%)',
        headerBlob: 'rgba(255,255,255,0.1)',
        theadBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        theadColor: 'white',
        rowEven: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        rowOdd: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
        borderColor: '#cbd5e1',
        footerBorder: '#3b82f6',
        footerText: '#6b7280'
      },
      minimal: {
        headerBg: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #f8fafc 100%)',
        headerBlob: 'rgba(0,0,0,0.05)',
        theadBg: 'linear-gradient(135deg, #475569, #334155)',
        theadColor: 'white',
        rowEven: '#f8fafc',
        rowOdd: '#ffffff',
        borderColor: '#e5e7eb',
        footerBorder: '#cbd5e1',
        footerText: '#6b7280'
      },
      sunset: {
        headerBg: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)',
        headerBlob: 'rgba(255,255,255,0.1)',
        theadBg: 'linear-gradient(135deg, #fb7185, #f97316)',
        theadColor: 'white',
        rowEven: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
        rowOdd: '#ffffff',
        borderColor: '#fed7aa',
        footerBorder: '#fb923c',
        footerText: '#7c2d12'
      },
      azure: {
        headerBg: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
        headerBlob: 'rgba(255,255,255,0.1)',
        theadBg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        theadColor: 'white',
        rowEven: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        rowOdd: '#ffffff',
        borderColor: '#bfdbfe',
        footerBorder: '#3b82f6',
        footerText: '#1e3a8a'
      },
      emerald: {
        headerBg: 'linear-gradient(135deg, #16a34a 0%, #10b981 50%, #34d399 100%)',
        headerBlob: 'rgba(255,255,255,0.1)',
        theadBg: 'linear-gradient(135deg, #10b981, #059669)',
        theadColor: 'white',
        rowEven: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        rowOdd: '#ffffff',
        borderColor: '#bbf7d0',
        footerBorder: '#10b981',
        footerText: '#065f46'
      }
    };
    return themes[theme] || themes.classic;
  }

  // Build print doc with theme colors injected (PRINT-SAFE)
  function printWithTheme(title, tableHtml, theme) {
    const colors = getThemeColors(theme);

    // Your existing mobile-optimized styles + theme color overrides + PRINT FIX
    const printStyles = `
      <style>
        /* CRITICAL: Force print backgrounds globally */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        @media print {
          body { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: absolute; left: 0; top: 0; width: 100%; }
          
          /* Extra enforcement for print backgrounds */
          .print-header,
          .print-header::before,
          .enhanced-table thead tr,
          .enhanced-table tbody tr,
          .enhanced-table tbody td,
          .print-footer {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        /* === NEW HEADER STYLES === */
        .print-header {
          text-align: center;
          background: ${colors.headerBg} !important;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 250px;
          height: 250px;
          background: ${colors.headerBlob} !important;
          border-radius: 50%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-header img {
          max-width: 120px;
          margin-bottom: 8px;
          position: relative;
          z-index: 2;
        }
        .print-header h1 {
          font-size: 20pt;
          font-weight: 800;
          color: white !important;
          margin: 6px 0 4px;
          position: relative;
          z-index: 2;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .print-header p {
          font-size: 9pt;
          color: white !important;
          margin: 2px 0;
          font-weight: 500;
          position: relative;
          z-index: 2;
        }

        /* === THEME COLOR OVERRIDES for existing table === */
        .enhanced-table thead tr {
          background: ${colors.theadBg} !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .enhanced-table thead th {
          color: ${colors.theadColor} !important;
        }
        .enhanced-table tbody tr:nth-child(even) {
          background: ${colors.rowEven} !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .enhanced-table tbody tr:nth-child(odd) {
          background: ${colors.rowOdd} !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .enhanced-table tbody tr:hover {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
        }
        .enhanced-table tbody td {
          border-left: 3px solid ${colors.borderColor} !important;
        }

        /* === NEW FOOTER STYLES === */
        .print-footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 3px solid ${colors.footerBorder};
          color: ${colors.footerText} !important;
          font-size: 8pt;
        }

        /* Keep ALL your existing table styles (spacing, fonts, transforms, etc.) */
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          width: 97%; 
          margin: 20px auto; 
          background: white; 
          color: black; 
        }
        .enhanced-table { 
          width: 100%; 
          border-collapse: separate; 
          border-spacing: 0 4px; 
          font-size: 10pt; 
          margin-top: 15px; 
        }
        .enhanced-table thead th { 
          padding: 12px 8px; 
          font-weight: 700; 
          text-align: center; 
          border: none; 
          font-size: 10pt; 
          text-transform: uppercase; 
          letter-spacing: 0.5px; 
          transform: skew(2deg); 
        }
        .enhanced-table tbody tr { 
          transform: skew(-1deg); 
          transition: all 0.3s ease; 
          border-radius: 8px; 
          box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
          margin-bottom: 2px; 
        }
        .enhanced-table tbody td { 
          padding: 10px 8px; 
          border: none; 
          transform: skew(1deg); 
        }
        .enhanced-table tbody td:nth-child(1) { 
          text-align: center; 
          font-weight: 700; 
          color: #1e40af !important; 
          background: rgba(59, 130, 246, 0.1) !important; 
          border-left: 3px solid #3b82f6 !important; 
          font-size: 11pt; 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .enhanced-table tbody td:nth-child(2) { 
          text-align: center; 
          font-weight: 600; 
          color: #374151 !important; 
        }
        .enhanced-table tbody td:nth-child(3) { 
          text-align: left; 
          font-weight: 600; 
          color: #1f2937 !important; 
          padding-left: 12px; 
        }
        .enhanced-table tbody td:nth-child(4), 
        .enhanced-table tbody td:nth-child(5), 
        .enhanced-table tbody td:nth-child(6), 
        .enhanced-table tbody td:nth-child(7) { 
          text-align: center; 
          color: #4b5563 !important; 
          font-weight: 500; 
        }
        .enhanced-table tbody td:nth-child(8) { 
          text-align: center; 
          font-weight: 700; 
          color: #059669 !important; 
          background: rgba(16, 185, 129, 0.1) !important; 
          border-left: 3px solid #10b981 !important; 
          font-size: 11pt; 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .enhanced-table tbody td:nth-child(9) { 
          text-align: center; 
          font-weight: 700; 
          color: #dc2626 !important; 
          background: rgba(239, 68, 68, 0.1) !important; 
          border-left: 3px solid #ef4444 !important; 
          font-size: 11pt; 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .enhanced-table tbody tr:nth-child(1) td:nth-child(1) { 
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%) !important; 
          color: #92400e !important; 
          border-left: 4px solid #f59e0b !important; 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .enhanced-table tbody tr:nth-child(2) td:nth-child(1) { 
          background: linear-gradient(135deg, #c0c0c0 0%, #e5e7eb 100%) !important; 
          color: #374151 !important; 
          border-left: 4px solid #6b7280 !important; 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .enhanced-table tbody tr:nth-child(3) td:nth-child(1) { 
          background: linear-gradient(135deg, #cd7f32 0%, #f97316 100%) !important; 
          color: #ffffff !important; 
          border-left: 4px solid #ea580c !important; 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        @media (max-width: 600px) {
          .enhanced-table { font-size: 9pt; }
          .enhanced-table th, .enhanced-table td { padding: 6px 4px; }
          .print-header img { width: 70px; }
          .print-header h1 { font-size: 16pt; }
        }
      </style>
    `;

    const printDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        ${printStyles}
      </head>
      <body>
        <div class="print-content">
          <div class="print-header">
            <img src="logo2.png" onerror="this.style.display='none'" alt="Logo">
            <h1>${title}</h1>
            <p>CRISPR Year-long Batch 2025–26</p>
            <p><strong>Exam Ranklist</strong></p>
          </div>
          ${tableHtml}
        <div class="print-footer">
            <p><strong>CRISPR • Year-long Batch 2025–26</strong></p>
            <p>This is an automated report generated by the Student Performance Tracking System</p>
            <p>Generated on ${currentDate} • For queries, contact the academic administration</p>
        </div>

      </body>
      </html>
    `;

    // Open print window (your existing flow)
    const printWindow = window.open('', '', 'width=800,height=600,scrollbars=yes');
    if (!printWindow) {
      alert('Please allow popups and try again.');
      return;
    }
    printWindow.document.write(printDoc);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { 
      try { 
        printWindow.print(); 
      } catch(e) { 
        console.log('Auto-print failed:', e); 
        alert('Please use the print button (Ctrl+P / Cmd+P) in the opened window.');
      } 
    }, 1000);
  }
})();

// Export all data function
function exportAllData() {
    alert('Exporting all data... This feature will be implemented soon!');
}

// Initialize footer when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure other scripts have loaded
    setTimeout(() => {
        updateFooterStats();
    }, 500);
    
    // Update footer stats every 30 seconds
    setInterval(updateFooterStats, 30000);
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    initializePrintExport();
  }, 1000);
});

/* -------------------------------------------------
   AUTO-START IN LIGHT THEME (WHITE)
   ------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Force light theme classes on <body>
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');

    // 2. Update the toggle button icon/text to show "dark" (because we are in light)
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        // If your button uses Font-Awesome icons:
        themeBtn.innerHTML = '<i class="fas fa-moon"></i>';   // moon = switch to dark
        // OR if you use plain text:
        // themeBtn.textContent = 'Dark Mode';
    }

    // 3. Store the preference (optional but recommended)
    localStorage.setItem('theme', 'light');
});