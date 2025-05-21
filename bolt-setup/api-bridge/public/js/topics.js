// Configuration
const API_BASE_URL = 'http://localhost:3030/api';

// State Management
let state = {
  topics: [],
  categories: [],
  clients: {},
  currentPage: 1,
  totalPages: 1,
  itemsPerPage: 12,
  filter: 'all',
  search: '',
  client: '',
  currentTopicId: null
};

// DOM Elements
const elements = {
  searchInput: document.getElementById('searchInput'),
  filtersContainer: document.getElementById('filters'),
  clientFilter: document.getElementById('clientFilter'),
  topicsGrid: document.getElementById('topicsGrid'),
  detailOverlay: document.getElementById('detailOverlay'),
  detailTitle: document.getElementById('detailTitle'),
  detailCategory: document.getElementById('detailCategory'),
  detailApproaches: document.getElementById('detailApproaches'),
  detailResponses: document.getElementById('detailResponses'),
  detailSources: document.getElementById('detailSources'),
  closeDetail: document.getElementById('closeDetail'),
  checkStatusButton: document.getElementById('checkStatusButton'),
  statusPanel: document.getElementById('statusPanel'),
  statusContent: document.getElementById('statusContent'),
  exportButton: document.getElementById('exportButton'),
  pagination: document.getElementById('pagination')
};

// Fetch Topics
async function fetchTopics() {
  showLoading();
  
  try {
    let url = `${API_BASE_URL}/topics?page=${state.currentPage}&limit=${state.itemsPerPage}`;
    
    // Add search parameter if exists
    if (state.search) {
      url += `&search=${encodeURIComponent(state.search)}`;
    }
    
    // Add category filter if not "all"
    if (state.filter !== 'all') {
      url += `&category=${encodeURIComponent(state.filter)}`;
    }
    
    // Add client filter if exists
    if (state.client) {
      url += `&client=${encodeURIComponent(state.client)}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch topics');
    }
    
    // Update state
    state.topics = data.topics || [];
    state.totalPages = data.total_pages || 1;
    state.currentPage = data.page || 1;
    
    // Update UI
    renderTopics();
    renderPagination();
    
    // Update filters if data is available
    if (data.categories) {
      state.categories = data.categories;
      updateCategoryFilters();
    }
    
    if (data.clients) {
      state.clients = data.clients;
      updateClientFilter();
    }
  } catch (error) {
    console.error('Error fetching topics:', error);
    showError(error.message);
  }
}

// Show Loading State
function showLoading() {
  elements.topicsGrid.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <span>Loading topics...</span>
    </div>
  `;
}

// Show Error State
function showError(message) {
  elements.topicsGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Error loading topics</div>
      <div class="empty-state-description">${message}</div>
    </div>
  `;
}

// Show Empty State
function showEmptyState() {
  elements.topicsGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-title">No topics found</div>
      <div class="empty-state-description">Try adjusting your search or filters</div>
    </div>
  `;
}

// Render Topics
function renderTopics() {
  if (!state.topics || state.topics.length === 0) {
    showEmptyState();
    return;
  }
  
  elements.topicsGrid.innerHTML = '';
  
  state.topics.forEach(topic => {
    // Create approach tags
    let approachesHtml = '';
    if (topic.approaches && topic.approaches.length > 0) {
      const approachesDisplay = topic.approaches.slice(0, 2);
      approachesHtml = approachesDisplay.map(approach => 
        `<span class="approach-tag">${escapeHtml(approach)}</span>`
      ).join('');
      
      if (topic.approaches.length > 2) {
        approachesHtml += `<span class="approach-tag">+${topic.approaches.length - 2} more</span>`;
      }
    } else {
      approachesHtml = '<span class="approach-tag">No approaches</span>';
    }
    
    // Get first response for preview (if available)
    let responsePreview = 'No response available';
    if (topic.responses && topic.responses.length > 0) {
      responsePreview = escapeHtml(topic.responses[0].text);
    }
    
    // Format sources
    let sourcesText = 'No sources';
    if (topic.sources && topic.sources.length > 0) {
      sourcesText = `${topic.sources.length} source${topic.sources.length !== 1 ? 's' : ''}`;
    }
    
    const card = document.createElement('div');
    card.className = 'topic-card';
    card.dataset.topic = topic.topic;
    card.innerHTML = `
      <div class="card-header">
        <div class="topic-title">${escapeHtml(topic.topic)}</div>
        <span class="topic-category">${escapeHtml(topic.category)}</span>
      </div>
      <div class="card-body">
        <div class="approach-tags">
          ${approachesHtml}
        </div>
        <div class="response-preview">${responsePreview}</div>
        <div class="source-indicator">${sourcesText}</div>
      </div>
    `;
    
    card.addEventListener('click', () => showTopicDetail(topic.topic));
    
    elements.topicsGrid.appendChild(card);
  });
}

// Render Pagination
function renderPagination() {
  elements.pagination.innerHTML = '';
  
  if (state.totalPages <= 1) {
    return;
  }
  
  // Previous button
  const prevButton = document.createElement('button');
  prevButton.className = `page-button ${state.currentPage === 1 ? 'disabled' : ''}`;
  prevButton.innerHTML = '&laquo;';
  prevButton.disabled = state.currentPage === 1;
  prevButton.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      fetchTopics();
    }
  });
  elements.pagination.appendChild(prevButton);
  
  // Page buttons
  const maxVisible = 5;
  const startPage = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(state.totalPages, startPage + maxVisible - 1);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement('button');
    pageButton.className = `page-button ${i === state.currentPage ? 'active' : ''}`;
    pageButton.textContent = i;
    pageButton.addEventListener('click', () => {
      state.currentPage = i;
      fetchTopics();
    });
    elements.pagination.appendChild(pageButton);
  }
  
  // Next button
  const nextButton = document.createElement('button');
  nextButton.className = `page-button ${state.currentPage === state.totalPages ? 'disabled' : ''}`;
  nextButton.innerHTML = '&raquo;';
  nextButton.disabled = state.currentPage === state.totalPages;
  nextButton.addEventListener('click', () => {
    if (state.currentPage < state.totalPages) {
      state.currentPage++;
      fetchTopics();
    }
  });
  elements.pagination.appendChild(nextButton);
}

// Update Category Filters
function updateCategoryFilters() {
  // Preserve the "All Topics" filter
  elements.filtersContainer.innerHTML = `
    <div class="filter ${state.filter === 'all' ? 'active' : ''}" data-filter="all">All Topics</div>
  `;
  
  // Add category filters
  state.categories.forEach(category => {
    const filterElement = document.createElement('div');
    filterElement.className = `filter ${state.filter === category ? 'active' : ''}`;
    filterElement.textContent = category;
    filterElement.dataset.filter = category;
    filterElement.addEventListener('click', () => {
      // Update active state
      document.querySelectorAll('.filter').forEach(el => el.classList.remove('active'));
      filterElement.classList.add('active');
      
      // Update filter and fetch
      state.filter = category;
      state.currentPage = 1;
      fetchTopics();
    });
    
    elements.filtersContainer.appendChild(filterElement);
  });
  
  // Add event listener to "All Topics" filter
  const allFilter = document.querySelector('.filter[data-filter="all"]');
  allFilter.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(el => el.classList.remove('active'));
    allFilter.classList.add('active');
    state.filter = 'all';
    state.currentPage = 1;
    fetchTopics();
  });
}

// Update Client Filter
function updateClientFilter() {
  // Preserve the "All Clients" option
  elements.clientFilter.innerHTML = '<option value="">All Clients</option>';
  
  // Add client options
  Object.keys(state.clients).forEach(client => {
    const option = document.createElement('option');
    option.value = client;
    option.textContent = `${client} (${state.clients[client]})`;
    option.selected = state.client === client;
    elements.clientFilter.appendChild(option);
  });
}

// Show Topic Detail
async function showTopicDetail(topicName) {
  try {
    const response = await fetch(`${API_BASE_URL}/topics/${encodeURIComponent(topicName)}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch topic details');
    }
    
    const topic = data.topic;
    state.currentTopicId = topic.topic;
    
    // Update detail view with topic data
    elements.detailTitle.textContent = topic.topic;
    elements.detailCategory.textContent = topic.category;
    
    // Approaches
    elements.detailApproaches.innerHTML = '';
    if (topic.approaches && topic.approaches.length > 0) {
      topic.approaches.forEach(approach => {
        const badge = document.createElement('span');
        badge.className = 'approach-badge';
        badge.textContent = approach;
        elements.detailApproaches.appendChild(badge);
      });
    } else {
      elements.detailApproaches.innerHTML = '<p>No approaches documented</p>';
    }
    
    // Responses
    elements.detailResponses.innerHTML = '';
    if (topic.responses && topic.responses.length > 0) {
      topic.responses.forEach(response => {
        const card = document.createElement('div');
        card.className = 'response-card';
        card.innerHTML = `
          <div class="response-text">${escapeHtml(response.text)}</div>
          <div class="response-meta">
            <div>Context: ${escapeHtml(response.context || 'Not specified')}</div>
            <div>Source: ${escapeHtml(response.source || 'Unknown')}</div>
          </div>
        `;
        elements.detailResponses.appendChild(card);
      });
    } else {
      elements.detailResponses.innerHTML = '<p>No responses available</p>';
    }
    
    // Sources
    elements.detailSources.innerHTML = '';
    if (topic.sources && topic.sources.length > 0) {
      topic.sources.forEach(source => {
        const li = document.createElement('li');
        li.className = 'source-item';
        li.textContent = source;
        elements.detailSources.appendChild(li);
      });
    } else {
      elements.detailSources.innerHTML = '<li class="source-item">No sources available</li>';
    }
    
    // Show the detail overlay
    elements.detailOverlay.classList.add('visible');
  } catch (error) {
    console.error('Error fetching topic details:', error);
    alert(`Error: ${error.message}`);
  }
}

// Check Topic Analyzer Status
async function checkStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/topic-analyzer/status`);
    const data = await response.json();
    
    // Create status content
    elements.statusContent.innerHTML = `
      <div class="status-item">
        <div class="status-label">Status</div>
        <div class="status-value">
          <span class="status-indicator ${data.status === 'active' ? 'status-active' : 'status-inactive'}"></span>
          ${data.status}
        </div>
      </div>
      
      <div class="status-item">
        <div class="status-label">Last Activity</div>
        <div class="status-value">${new Date(data.last_activity).toLocaleString()}</div>
      </div>
      
      <div class="status-item">
        <div class="status-label">Minutes Since Activity</div>
        <div class="status-value">${data.minutes_since_activity}</div>
      </div>
      
      <div class="status-item">
        <div class="status-label">Processed Files</div>
        <div class="status-value">${data.processed_files || 0}</div>
      </div>
      
      <div class="status-item">
        <div class="status-label">Topics Count</div>
        <div class="status-value">${data.topics_count || 0}</div>
      </div>
    `;
    
    if (data.sample_topics && data.sample_topics.length > 0) {
      elements.statusContent.innerHTML += `
        <div class="status-item" style="grid-column: 1 / -1;">
          <div class="status-label">Sample Topics</div>
          <div class="status-value">${data.sample_topics.join(', ')}</div>
        </div>
      `;
    }
    
    // Show the status panel
    elements.statusPanel.style.display = 'block';
  } catch (error) {
    console.error('Error checking status:', error);
    alert(`Error checking status: ${error.message}`);
  }
}

// Export Topic to Notion
function exportToNotion() {
  if (!state.currentTopicId) {
    alert('Please select a topic to export first');
    return;
  }
  
  alert(`Exporting topic "${state.currentTopicId}" to Notion. This functionality would be implemented in a production version.`);
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Event Listeners
function setupEventListeners() {
  // Search input
  elements.searchInput.addEventListener('keyup', event => {
    if (event.key === 'Enter') {
      state.search = elements.searchInput.value.trim();
      state.currentPage = 1;
      fetchTopics();
    }
  });
  
  // Client filter
  elements.clientFilter.addEventListener('change', () => {
    state.client = elements.clientFilter.value;
    state.currentPage = 1;
    fetchTopics();
  });
  
  // Close detail view
  elements.closeDetail.addEventListener('click', () => {
    elements.detailOverlay.classList.remove('visible');
  });
  
  // Close detail when clicking outside
  elements.detailOverlay.addEventListener('click', event => {
    if (event.target === elements.detailOverlay) {
      elements.detailOverlay.classList.remove('visible');
    }
  });
  
  // Check status button
  elements.checkStatusButton.addEventListener('click', checkStatus);
  
  // Export button
  elements.exportButton.addEventListener('click', exportToNotion);
}

// Initialize App
function initApp() {
  setupEventListeners();
  fetchTopics();
}

// Start the app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);