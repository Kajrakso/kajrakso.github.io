const SUPABASE_URL = 'https://xrkgsfgqlbbauvpnkzha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhya2dzZmdxbGJiYXV2cG5remhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5Mzc1MTgsImV4cCI6MjA1OTUxMzUxOH0.1YfQV8RKGOFcrnPesQmOETSWXmzorheHlltDjz2QB1o';

const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Data structure for tabs and their corresponding tables
const tabsTables = [
    { label: "Corners", tableName: "viw_alg_3c" },
    { label: "Edges", tableName: "viw_alg_3e" },
    { label: "Wings", tableName: "viw_alg_3w" },
    { label: "LTCT", tableName: "viw_alg_ltct" },
    // Add more tables here in the future by following the same structure
];

function generateTabs() {
    const tabButtonsContainer = document.getElementById('tab-buttons');
    const tabsContentContainer = document.getElementById('tabs-content');

    tabsTables.forEach((tab, index) => {
        // Create tab button
        const tabButton = document.createElement('button');
        tabButton.textContent = tab.label;
        tabButton.classList.add('tab-button');
        tabButton.setAttribute('data-tab', `tab${index}`);
        tabButton.onclick = () => showTab(`tab${index}`);

        // Append button to the tabs container
        tabButtonsContainer.appendChild(tabButton);

        // Create corresponding tab content section
        const tabContent = document.createElement('div');
        tabContent.id = `tab${index}`;
        tabContent.classList.add('tab-content');
        tabContent.innerHTML = `<p>Loading ${tab.label} data...</p>`;

        // Append content section to the tabs content container
        tabsContentContainer.appendChild(tabContent);
    });
}

async function fetchData(tableName, tabId) {
    try {
        const { data, error } = await supa
            .from(tableName)
            .select('*')
            .not('alg', 'is',  null);

        const tabContent = document.getElementById(tabId);

        if (error) {
            throw error;
        }

        if (data && data.length > 0) {
          if (tableName == "viw_alg_ltct"){
            tabContent.innerHTML = `
                <ul>
                    ${data.map(item => `<li>${item.parity_target}-[${item.twist}]: ${item.alg}</li>`).join('')}
                </ul>
            `;
          } else {
            tabContent.innerHTML = `
                <ul>
                    ${data.map(item => `<li>${item.p1}-${item.p2}-${item.p3}: ${item.alg}</li>`).join('')}
                </ul>
            `;
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
        const activeTabIndex = tabId.replace('tab', '');
        fetchData(tabsTables[activeTabIndex].tableName, tabId);
    }
}


// Toggle login dropdown
document.getElementById('login-button').addEventListener('click', () => {
    const dropdown = document.getElementById('login-dropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
});

// Sign In with Email and Password
document.getElementById('sign-in').addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }

    const { data, error } = await supa.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Sign-in error: ' + error.message);
    } else {
        document.getElementById('login-button').textContent = data.user.email;
        document.getElementById('login-dropdown').style.display = 'none';
    }
});

// Sign Out
document.getElementById('sign-out').addEventListener('click', async () => {
    const { error } = await supa.auth.signOut();

    if (error) {
        alert('Sign-out error: ' + error.message);
    } else {
        document.getElementById('login-button').textContent = 'Login';
        document.getElementById('login-dropdown').style.display = 'none';
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const container = document.getElementById('login-container');
    if (!container.contains(e.target)) {
        document.getElementById('login-dropdown').style.display = 'none';
    }
});


// Auto-update login button if user is already signed in
window.onload = async () => {
    generateTabs();
    showTab('tab0');

    const { data: { session } } = await supa.auth.getSession();
    if (session) {
      document.getElementById('login-button').textContent = session.user.email;
      document.getElementById('admin-button').style.display = 'inline-block';
    } else {
      document.getElementById('admin-button').style.display = 'none';
    }
};
