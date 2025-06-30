const SUPABASE_URL = 'https://xrkgsfgqlbbauvpnkzha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhya2dzZmdxbGJiYXV2cG5remhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5Mzc1MTgsImV4cCI6MjA1OTUxMzUxOH0.1YfQV8RKGOFcrnPesQmOETSWXmzorheHlltDjz2QB1o';

const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Data structure for tabs and their corresponding tables
const tabsTables = {
    "Corners": "viw_alg_3c",
    "Edges": "viw_alg_3e",
    "Wings": "viw_alg_3w",
    "LTCT": "viw_alg_ltct",
    // Add more tables here in the future by following the same structure
};

async function fetchData(tableName, tabId) {
    try {
        const { data, error } = await supa
            .from(tableName)
            .select('*')
            .not('alg', 'is',  null);

        if (error) {
            throw error;
        }

        const tabContent = document.getElementById(tabId);

        if (data && data.length > 0) {
            const grouped = {};

            switch (tabId){
                case 'Corners':
                case 'Edges':
                case 'Wings':
                    data.forEach(({ p1, p2, p3, alg }) => {
                      if (!grouped[p1]) grouped[p1] = {};
                      if (!grouped[p1][p2]) grouped[p1][p2] = [];
                      grouped[p1][p2].push({ p3, alg });
                    });

                    for (const p1 in grouped) {
                      const p1Summary = document.createElement("h3");
                      const p1Details = document.createElement("div");
                      p1Summary.textContent = `Buffer: ${p1}`;
                      p1Details.appendChild(p1Summary);

                      for (const p2 in grouped[p1]) {
                        const p2Details = document.createElement("details");
                        const p2Summary = document.createElement("summary");
                        p2Summary.textContent = `${p2}`;
                        p2Details.appendChild(p2Summary);

                        grouped[p1][p2].forEach(({ p3, alg }) => {
                          const entryDiv = document.createElement("div");
                          entryDiv.className = "entry";
                          entryDiv.innerHTML = `<span>${p2}-${p3}:</span><span>${alg}</span>`;
                          p2Details.appendChild(entryDiv);
                        });

                        p1Details.appendChild(p2Details);
                      }

                      tabContent.appendChild(p1Details);
                    }
                    break;

                case 'LTCT':
                    data.forEach(({ parity_target, twist, alg }) => {
                      if (!grouped[parity_target]) grouped[parity_target] = [];
                      grouped[parity_target].push({ twist, alg });
                    });

                    for (const p1 in grouped) {
                      const p1Details = document.createElement("details");
                      const p1Summary = document.createElement("summary");
                      p1Summary.textContent = `${p1}`;
                      p1Details.appendChild(p1Summary);

                    grouped[p1].forEach(({ twist, alg }) => {
                      const entryDiv = document.createElement("div");
                      entryDiv.className = "entry";
                      entryDiv.innerHTML = `<span>${twist}:</span> ${alg}`;
                      p1Details.appendChild(entryDiv);
                    });

                      tabContent.appendChild(p1Details);
                    }
                    break;

                default:
                    console.log(`No match for tabId = ${tabId}`);
                    break;
            }
        } else {
            tabContent.innerHTML = '<p>No data found.</p>';
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        const tabContent = document.getElementById(tabId);
        tabContent.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

function showTab(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.style.display = 'none';
    });

    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    const activeTab = document.getElementById(tabId);
    activeTab.style.display = 'block';

    const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    activeButton.classList.add('active');

    // Fetch data for the active tab if not already loaded
    if (!activeTab.innerHTML || activeTab.innerHTML.includes('Loading')) {
        fetchData(tabsTables[tabId], tabId);
    }
}

window.onload = async () => {
    const hash = window.location.hash.substring(1); // remove the "#"
    showTab(hash in tabsTables ? hash : "Corners");
};
