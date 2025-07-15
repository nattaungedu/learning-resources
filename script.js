let historyStack = [];
let currentCards = [];
let allGradesData = null;
const contentBasePath = '/content/';
let sidebarVisible = false;
let currentScale = 1;
let isZoomed = false;

function sanitizeForUrl(name) {
    if (!name) return '';
    return encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'));
}

function unsanitizeFromUrl(name) {
    return decodeURIComponent(name.replace(/-/g, ' '));
}

function transitionTo(newContentFn, data, title, path, skipHistory = false) {
    const container = document.getElementById('container');
    document.title = title;

    container.classList.add('slide-out');
    setTimeout(() => {
        container.innerHTML = '';
        newContentFn(data, title, path, true);
        container.classList.remove('slide-out');
        container.classList.add('slide-in');
        setTimeout(() => container.classList.remove('slide-in'), 300);

        if (!skipHistory && path) {
            if (window.location.hash.slice(1) !== path) {
                window.location.hash = path;
            }
        }

        displayBreadcrumbs();
        updateActiveTreeItem(path);
    }, 300);
}

function displayBreadcrumbs() {
    const div = document.getElementById('breadcrumbs');
    div.innerHTML = '';

    historyStack.forEach((entry, index) => {
        if (index > 0) {
            const separator = document.createElement('span');
            separator.textContent = ' > ';
            div.appendChild(separator);
        }
        const crumb = document.createElement('span');
        crumb.textContent = entry.title;

        if (index < historyStack.length - 1) {
            crumb.style.cursor = 'pointer';
            crumb.onclick = () => goBackTo(index);
        } else if (index === 0 && historyStack.length > 1) {
            crumb.style.cursor = 'pointer';
            crumb.onclick = () => {
                const rootPath = '/home';
                historyStack = [historyStack[0]];
                transitionTo(displayGrades, allGradesData.grades, 'မာတိကာ', rootPath, true);
                window.location.hash = rootPath;
            };
        }

        div.appendChild(crumb);
    });
}

function goBackTo(index) {
    if (index >= 0 && index < historyStack.length) {
        historyStack = historyStack.slice(0, index + 1);
        const entry = historyStack.at(-1);
        entry.fn(entry.data, entry.title, entry.path, true);
        window.location.hash = entry.path;
        displayBreadcrumbs();
    }
}

function displayGrades(grades, title = "မာတိကာ", path = '/home', skip = false) {
    transitionTo(() => {
        const container = document.getElementById('container');
        container.innerHTML = '';
        
        grades.forEach(grade => {
            const card = document.createElement('div');
            card.className = 'card';
            card.textContent = grade.name;
            card.onclick = () => {
                card.classList.add('bounce');
                setTimeout(() => card.classList.remove('bounce'), 400);
                const gradePath = `/home/${sanitizeForUrl(grade.name)}`;
                historyStack.push({
                    fn: displaySubjects,
                    data: grade.subjects,
                    title: grade.name,
                    path: gradePath
                });
                displaySubjects(grade.subjects, grade.name, gradePath);
                window.location.hash = gradePath;
            };
            container.appendChild(card);
        });
    }, grades, title, path, skip);
}

function displaySubjects(subjects, title, path, skip = false) {
    transitionTo(() => {
        const container = document.getElementById('container');
        container.innerHTML = '';
        
        subjects.forEach(subject => {
            const card = document.createElement('div');
            card.className = 'card';
            card.textContent = subject.name;
            card.onclick = () => {
                card.classList.add('bounce');
                setTimeout(() => card.classList.remove('bounce'), 400);
                const subjectPath = `${path}/${sanitizeForUrl(subject.name)}`;
                
                // Determine what to display based on subject structure
                let nextFn;
                let nextData;
                
                if (subject.chapters) {
                    nextFn = displayChapters;
                    nextData = subject.chapters;
                } else if (subject.lessons) {
                    nextFn = displayLessons;
                    nextData = subject.lessons;
                } else if (subject.content) {
                    nextFn = displayContent;
                    nextData = subject.content;
                }
                
                historyStack.push({
                    fn: nextFn,
                    data: nextData,
                    title: subject.name,
                    path: subjectPath
                });
                
                nextFn(nextData, subject.name, subjectPath);
                window.location.hash = subjectPath;
            };
            container.appendChild(card);
        });
    }, subjects, title, path, skip);
}

function displayChapters(chapters, title, path, skip = false) {
    transitionTo(() => {
        const container = document.getElementById('container');
        container.innerHTML = '';
        
        chapters.forEach(chapter => {
            const card = document.createElement('div');
            card.className = 'card';
            card.textContent = chapter.name;
            card.onclick = () => {
                card.classList.add('bounce');
                setTimeout(() => card.classList.remove('bounce'), 400);
                const chapterPath = `${path}/${sanitizeForUrl(chapter.name)}`;
                
                // Determine what to display based on chapter structure
                let nextFn;
                let nextData;
                
                if (chapter.lessons) {
                    nextFn = displayLessons;
                    nextData = chapter.lessons;
                } else if (chapter.content) {
                    nextFn = displayContent;
                    nextData = chapter.content;
                }
                
                historyStack.push({
                    fn: nextFn,
                    data: nextData,
                    title: chapter.name,
                    path: chapterPath
                });
                
                nextFn(nextData, chapter.name, chapterPath);
                window.location.hash = chapterPath;
            };
            container.appendChild(card);
        });
    }, chapters, title, path, skip);
}

function displayLessons(lessons, title, path, skip = false) {
    transitionTo(() => {
        const container = document.getElementById('container');
        container.innerHTML = '';
        
        lessons.forEach(lesson => {
            const card = document.createElement('div');
            card.className = 'card';
            card.textContent = lesson.name;
            card.onclick = () => {
                card.classList.add('bounce');
                setTimeout(() => card.classList.remove('bounce'), 400);
                const lessonPath = `${path}/${sanitizeForUrl(lesson.name)}`;
                historyStack.push({
                    fn: displayContent,
                    data: lesson.content,
                    title: lesson.name,
                    path: lessonPath
                });
                displayContent(lesson.content, lesson.name, lessonPath);
                window.location.hash = lessonPath;
            };
            container.appendChild(card);
        });
    }, lessons, title, path, skip);
}

async function displayContent(content, title, path, skip = false) {
  console.log("[displayContent] Called with title:", title);

  let raw = content.body || '';

  if (content.bodyFilename) {
    try {
      raw = await fetch(content.bodyFilename).then(r => r.text());
      console.log("[displayContent] Loaded from file:", content.bodyFilename);
    } catch (err) {
      console.error("[displayContent] Failed to load bodyFilename:", err);
      raw = 'Failed to load content.';
    }
  }

  // Parse Markdown
  let htmlBody = marked.parse(raw);
  console.log("[displayContent] Parsed Markdown HTML");

  // Inject into DOM via transition
  transitionTo(() => {
    console.log("[displayContent] transitionTo called");
    const container = document.getElementById('container');
    const isSmallScreen = window.innerWidth <= 768;

    if (isSmallScreen && htmlBody.includes("<table")) {
      container.style.width = "100%";
      container.style.overflowX = "auto";
    }


    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.innerHTML = htmlBody;

    container.innerHTML = '';
    container.appendChild(contentDiv);
    currentCards = [];
    // Attach image click handlers after DOM injection
    const images = contentDiv.querySelectorAll('img');
    console.log("[displayContent] Found images:", images.length);

  }, content, title, path, skip);
}

// Sidebar toggle functionality
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebarVisible = !sidebarVisible;
    
    if (sidebarVisible) {
        sidebar.classList.add('show');
        overlay.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
            sidebar.style.transform = 'translateX(0)';
        }, 10);
    } else {
        sidebar.style.transform = 'translateX(-100%)';
        overlay.style.opacity = '0';
        setTimeout(() => {
            sidebar.classList.remove('show');
            overlay.style.display = 'none';
        }, 300);
    }
}

// Build sidebar tree
function buildTree(data, parentElement, level = 0) {
    if (!data || !parentElement) return;
    
    data.forEach(item => {
        const node = document.createElement('div');
        node.className = 'tree-node';
        
        const header = document.createElement('div');
        header.className = 'tree-header';
        
        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle';
        toggle.innerHTML = (item.subjects || item.chapters || item.lessons) ? '▶' : '•';
        
        const link = document.createElement('a');
        link.className = 'tree-link';
        link.textContent = item.name;
        link.href = `#${getPathForItem(item)}`;
        
        header.appendChild(toggle);
        header.appendChild(link);
        node.appendChild(header);
        
        // Add click handler to the entire header
        header.onclick = (e) => {
            // Only handle if not clicking on toggle
            if (e.target !== toggle) {
                e.preventDefault();
                navigateToItem(item);
                if (window.innerWidth < 768) toggleSidebar();
            }
        };
        
        // Toggle functionality for expandable items
        if (item.subjects || item.chapters || item.lessons) {
            toggle.onclick = (e) => {
                e.stopPropagation();
                const childrenDiv = node.querySelector('.tree-children');
                if (childrenDiv) {
                    childrenDiv.style.display = childrenDiv.style.display === 'none' ? 'block' : 'none';
                    toggle.classList.toggle('open');
                }
            };
        }
        
        let children = [];
        if (item.subjects) children = item.subjects;
        else if (item.chapters) children = item.chapters;
        else if (item.lessons) children = item.lessons;
        
        if (children.length > 0) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'tree-children';
            childrenDiv.style.display = level === 0 ? 'block' : 'none';
            buildTree(children, childrenDiv, level + 1);
            node.appendChild(childrenDiv);
        }
        
        parentElement.appendChild(node);
    });
}

function getPathForItem(item) {
    let path = '';
    if (item.type === 'grade') {
        path = `/home/${sanitizeForUrl(item.name)}`;
    } else if (item.type === 'subject') {
        path = `/home/${sanitizeForUrl(item.grade)}/${sanitizeForUrl(item.name)}`;
    } else if (item.type === 'chapter') {
        path = `/home/${sanitizeForUrl(item.grade)}/${sanitizeForUrl(item.subject)}/${sanitizeForUrl(item.name)}`;
    } else if (item.type === 'lesson') {
        if (item.chapter) {
            path = `/home/${sanitizeForUrl(item.grade)}/${sanitizeForUrl(item.subject)}/${sanitizeForUrl(item.chapter)}/${sanitizeForUrl(item.name)}`;
        } else {
            path = `/home/${sanitizeForUrl(item.grade)}/${sanitizeForUrl(item.subject)}/${sanitizeForUrl(item.name)}`;
        }
    }
    return path;
}

function navigateToItem(item) {
    const path = getPathForItem(item);
    window.location.hash = path;
}

function updateActiveTreeItem(path) {
    // Remove active class from all tree links
    const links = document.querySelectorAll('.tree-link');
    links.forEach(link => link.classList.remove('active'));
    
    // Find matching path and add active class
    const matchingLink = document.querySelector(`.tree-link[href="#${path}"]`);
    if (matchingLink) {
        matchingLink.classList.add('active');
        
        // Expand parent nodes
        let parent = matchingLink.closest('.tree-children');
        while (parent) {
            parent.style.display = 'block';
            const toggle = parent.previousElementSibling?.querySelector('.tree-toggle');
            if (toggle) {
                toggle.classList.add('open');
            }
            parent = parent.parentElement.closest('.tree-children');
        }
    }
}

// ─── Helpers ──────────────────────────────────────────

// Strip Markdown & HTML for plain‑text snippets
function stripSyntax(str = '') {
  return str
    .replace(/[#>*_\-\[\]\(\)`]/g, '')
    .replace(/<\/?[^>]+(>|$)/g, '');
}

// Extract ~L chars around the first match of term
function getSnippet(text, term, L = 120) {
  const lower = text.toLowerCase();
  const idx   = lower.indexOf(term.toLowerCase());
  if (idx === -1) {
    return text.length > L ? text.slice(0, L) + '…' : text;
  }
  const start = Math.max(0, idx - Math.floor(L/2));
  let snippet = text.slice(start, start + L);
  if (start > 0)           snippet = '…' + snippet;
  if (start + L < text.length) snippet += '…';
  return snippet;
}

// Highlight all occurrences of term in text with <mark>
function highlightText(text = '', term = '') {
  if (!term) return text;
  const esc = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  return text.replace(new RegExp(`(${esc})`, 'gi'), '<mark>$1</mark>');
}


// ─── initSearch ───────────────────────────────────────
function initSearch() {
  const searchInput = document.getElementById('global-search');
  const searchBtn   = document.getElementById('search-btn');

  const performSearch = () => {
    const raw = searchInput.value.trim();
    const term = raw.toLowerCase();

    if (!term) {
      displayNoResults();
      return;
    }

    const results = searchContent(term);

    // Replace last stack item if it’s already a search
    const last = historyStack.at(-1);
    if (last && last.title?.startsWith('Search:')) {
      historyStack.pop();
    }

    historyStack.push({
      fn: displaySearchResults,
      data: results,
      title: `Search: ${raw}`,
      path: `/search/${encodeURIComponent(raw)}`
    });

    window.location.hash = `/search/${encodeURIComponent(raw)}`;

    results.length
      ? displaySearchResults(results, term)
      : displayNoResults();
  };

  searchInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') performSearch();
  });
  searchBtn.addEventListener('click', performSearch);
}


// ─── searchContent ───────────────────────────────────
function searchContent(term) {
  const results = [];

  allGradesData.grades.forEach(grade => {
    // grade‑level match
    if (grade.name.toLowerCase().includes(term)) {
      results.push({
        type:  'Grade',
        name:  grade.name,
        grade: grade.name,
        path:  `/home/${sanitizeForUrl(grade.name)}`
      });
    }

    grade.subjects.forEach(subject => {
      // flatten lessons under subject
      const lessons = [
        ...(subject.lessons || []),
        ...((subject.chapters || []).flatMap(ch =>
          (ch.lessons || []).map(l => ({ ...l, chapter: ch.name }))
        ))
      ];

      lessons.forEach(lesson => {
        const bodyPlain = stripSyntax(lesson.content?.body || '');
        const haystack  = [
          lesson.name,
          lesson.content?.title || '',
          bodyPlain
        ].join(' ').toLowerCase();

if (haystack.includes(term)) {
  results.push({
    type:         'Lesson',
    grade:        grade.name,
    subject:      subject.name,
    chapter:      lesson.chapter,
    name:         lesson.name,
    contentTitle: lesson.content?.title || '',
    content:      lesson.content, // ✅ Add this line
    path:         getPathForItem({
      type:    'lesson',
      grade:   grade.name,
      subject: subject.name,
      chapter: lesson.chapter,
      name:    lesson.name
    })
  });
}

      });
    });
  });

  return results;
}


// ─── displaySearchResults ────────────────────────────
function displaySearchResults(results, term) {

    transitionTo(async () => {
        const container = document.getElementById('container');
        container.innerHTML = '';

        const resultsHeader = document.createElement('h2');
        resultsHeader.innerHTML = `Search Results <span class="result-count">(${results.length})</span>`;
        resultsHeader.style.textAlign = 'center';
        resultsHeader.style.marginBottom = '20px';
        container.appendChild(resultsHeader);

        const resultsGrid = document.createElement('div');
        resultsGrid.className = 'search-results-grid';
        container.appendChild(resultsGrid);

        for (const result of results) {
            const card = document.createElement('div');
            card.className = 'search-card';

            const typeBadge = document.createElement('div');
            typeBadge.className = 'type-badge';
            typeBadge.textContent = result.type;

            const title = document.createElement('div');
            title.className = 'search-title';
            title.innerHTML = highlightText(result.name, term);

            const trail = document.createElement('div');
            trail.className = 'search-trail';
            if (result.grade) trail.innerHTML += `<span>${highlightText(result.grade, term)}</span>`;
            if (result.subject) trail.innerHTML += `<span> › ${highlightText(result.subject, term)}</span>`;
            if (result.chapter) trail.innerHTML += `<span> › ${highlightText(result.chapter, term)}</span>`;
            if (result.type === 'Lesson') trail.innerHTML += `<span> › Lesson</span>`;

            const snippets = document.createElement('div');
            snippets.className = 'search-snippets';

            // Fetch content body (from inline string or external .html)
            let html = '';
            if (result.content && typeof result.content.body === 'string') {
                if (result.content.body.endsWith('.html')) {
                    try {
                        const res = await fetch(`/content/${result.content.body}`);
                        if (res.ok) {
                            html = await res.text();
                        } else {
                            html = `<p style="color:red;">Error loading ${result.content.body}</p>`;
                        }
                    } catch (err) {
                        html = `<p style="color:red;">Fetch failed: ${err.message}</p>`;
                    }
                } else {
                    // Markdown -> HTML
                    html = typeof marked !== 'undefined'
                        ? marked.parse(result.content.body)
                        : result.content.body;
                }
            }

            // Extract preview blocks
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const blocks = Array.from(tempDiv.querySelectorAll('p, li, div, h1, h2, h3, h4, h5, h6, pre'));

            const lowerTerm = term.toLowerCase();
            let matchIndex = blocks.findIndex(block =>
                block.textContent.toLowerCase().includes(lowerTerm)
            );

            let sliceStart = 0;
            if (matchIndex !== -1) {
                sliceStart = Math.max(0, matchIndex - 2);
            }

            const slicedBlocks = blocks.slice(sliceStart, sliceStart + 5);

            slicedBlocks.forEach(block => {
                const snippetLine = document.createElement('div');
                snippetLine.className = 'snippet-line';
                snippetLine.innerHTML = highlightText(block.outerHTML, term);
                snippets.appendChild(snippetLine);
            });

            const viewButton = document.createElement('button');
            viewButton.className = 'view-button';
            viewButton.textContent = 'View Content';
            viewButton.onclick = (e) => {
                e.stopPropagation();
                window.location.hash = result.path;
            };

            card.appendChild(typeBadge);
            card.appendChild(title);
            card.appendChild(trail);
            card.appendChild(snippets);
            card.appendChild(viewButton);

            card.onclick = () => {
                window.location.hash = result.path;
            };

            resultsGrid.appendChild(card);
        }
    }, results, 'Search Results', '/search', true);
}


// ─── displayNoResults ────────────────────────────────
function displayNoResults() {
  transitionTo(() => {
    const c = document.getElementById('container');
    c.innerHTML = `
      <div class="content">
        <h2 style="text-align:center;">No Results Found</h2>
        <p style="text-align:center;">Try different search terms</p>
      </div>
    `;
  }, null, 'No Results', '/search', true);
}

// Dark mode
function setDarkModeIcon() {
    const icon = document.getElementById('dark-mode-icon');
    const search_icon = document.getElementById('search-btn-icon')
    const isDark = document.body.classList.contains('dark');
    
    if (isDark) {
        icon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" fill="none">
                <circle cx="12" cy="12" r="5" stroke="orange" stroke-width="2"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="orange" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
        search_icon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C8.01 14 6 11.99 6 9.5S8.01 5 10.5 5 15 7.01 15 9.5 12.99 14 10.5 14z"/>
        </svg>
        `;

    } else {
        icon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="black"/>
            </svg>
        `;
        search_icon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C8.01 14 6 11.99 6 9.5S8.01 5 10.5 5 15 7.01 15 9.5 12.99 14 10.5 14z"/>
        </svg>
        `;

    }
}

// Initialize sidebar
function initSidebar() {
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-close').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', toggleSidebar);
}

// Router function to handle all content structures
function router() {
    const path = window.location.hash.slice(1) || '/home';
    const segments = path.split('/').filter(Boolean);

    if (!allGradesData) return;

    // Handle search route
if (segments[0] === 'search') {
    const searchTermRaw = segments[1] ? unsanitizeFromUrl(segments[1]) : '';
const searchTerm = searchTermRaw.toLowerCase();

    if (searchTerm) {
        document.getElementById('global-search').value = searchTerm;

        // Clear old search stack
        historyStack = [{
            fn: displayGrades,
            data: allGradesData.grades,
            title: "မာတိကာ",
            path: "/home"
        }];

        const results = searchContent(searchTerm);
        historyStack.push({
            fn: displaySearchResults,
            data: results,
            title: `Search: ${searchTerm}`,
            path: `/search/${encodeURIComponent(searchTerm)}`
        });

        results.length
            ? displaySearchResults(results, searchTerm)
            : displayNoResults();
    }
    return;
}


    // Reset history stack
    historyStack = [];
    
    // Always start with the root
    historyStack.push({
        fn: displayGrades,
        data: allGradesData.grades,
        title: "မာတိကာ",
        path: '/home'
    });

    // If we're at the root, just display it
    if (segments.length === 0 || segments[0] !== 'home') {
        displayGrades(allGradesData.grades, "မာတိကာ", '/home', true);
        return;
    }

    // Grade level
    if (segments.length >= 2) {
        const grade = allGradesData.grades.find(g => sanitizeForUrl(g.name) === segments[1]);
        if (grade) {
            historyStack.push({
                fn: displaySubjects,
                data: grade.subjects,
                title: grade.name,
                path: `/home/${sanitizeForUrl(grade.name)}`
            });
        }
    }

    // Subject level
    if (segments.length >= 3) {
        const grade = allGradesData.grades.find(g => sanitizeForUrl(g.name) === segments[1]);
        if (grade) {
            const subject = grade.subjects.find(s => sanitizeForUrl(s.name) === segments[2]);
            if (subject) {
                let nextFn, nextData;
                
                if (subject.chapters) {
                    nextFn = displayChapters;
                    nextData = subject.chapters;
                } else if (subject.lessons) {
                    nextFn = displayLessons;
                    nextData = subject.lessons;
                } else if (subject.content) {
                    nextFn = displayContent;
                    nextData = subject.content;
                }
                
                historyStack.push({
                    fn: nextFn,
                    data: nextData,
                    title: subject.name,
                    path: `/home/${sanitizeForUrl(grade.name)}/${sanitizeForUrl(subject.name)}`
                });
            }
        }
    }

    // Chapter level
    if (segments.length >= 4) {
        const grade = allGradesData.grades.find(g => sanitizeForUrl(g.name) === segments[1]);
        if (grade) {
            const subject = grade.subjects.find(s => sanitizeForUrl(s.name) === segments[2]);
            if (subject && subject.chapters) {
                const chapter = subject.chapters.find(c => sanitizeForUrl(c.name) === segments[3]);
                if (chapter) {
                    let nextFn, nextData;
                    
                    if (chapter.lessons) {
                        nextFn = displayLessons;
                        nextData = chapter.lessons;
                    } else if (chapter.content) {
                        nextFn = displayContent;
                        nextData = chapter.content;
                    }
                    
                    historyStack.push({
                        fn: nextFn,
                        data: nextData,
                        title: chapter.name,
                        path: `/home/${sanitizeForUrl(grade.name)}/${sanitizeForUrl(subject.name)}/${sanitizeForUrl(chapter.name)}`
                    });
                }
            }
        }
    }

    // Lesson level
    if (segments.length >= 5) {
        const grade = allGradesData.grades.find(g => sanitizeForUrl(g.name) === segments[1]);
        if (grade) {
            const subject = grade.subjects.find(s => sanitizeForUrl(s.name) === segments[2]);
            if (subject) {
                let lesson;
                
                // Check if subject has chapters
                if (subject.chapters) {
                    const chapter = subject.chapters.find(c => sanitizeForUrl(c.name) === segments[3]);
                    if (chapter && chapter.lessons) {
                        lesson = chapter.lessons.find(l => sanitizeForUrl(l.name) === segments[4]);
                    }
                } 
                // Or if subject has lessons directly
                else if (subject.lessons) {
                    lesson = subject.lessons.find(l => sanitizeForUrl(l.name) === segments[3]);
                }
                
                if (lesson) {
                    historyStack.push({
                        fn: displayContent,
                        data: lesson.content,
                        title: lesson.name,
                        path: window.location.hash.slice(1)
                    });
                }
            }
        }
    } 
    // Handle direct lesson access (without chapter)
    else if (segments.length === 4) {
        const grade = allGradesData.grades.find(g => sanitizeForUrl(g.name) === segments[1]);
        if (grade) {
            const subject = grade.subjects.find(s => sanitizeForUrl(s.name) === segments[2]);
            if (subject && subject.lessons) {
                const lesson = subject.lessons.find(l => sanitizeForUrl(l.name) === segments[3]);
                if (lesson) {
                    historyStack.push({
                        fn: displayContent,
                        data: lesson.content,
                        title: lesson.name,
                        path: window.location.hash.slice(1)
                    });
                }
            }
        }
    }

    // Display the current page
    if (historyStack.length > 0) {
        const current = historyStack[historyStack.length - 1];
        current.fn(current.data, current.title, current.path, true);
    }
    
    displayBreadcrumbs();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
    }
    setDarkModeIcon();
    
    // Dark mode toggle
    document.getElementById('dark-mode-btn').onclick = () => {
        document.body.classList.toggle('dark');
        localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
        setDarkModeIcon();
    };
    
    // Initialize components
    initSidebar();
    initSearch();
    
    // Load data
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            allGradesData = data;
            
            // Enhance data with hierarchy information
            data.grades.forEach(grade => {
                grade.type = 'grade';
                grade.subjects.forEach(subject => {
                    subject.type = 'subject';
                    subject.grade = grade.name;
                    
                    if (subject.chapters) {
                        subject.chapters.forEach(chapter => {
                            chapter.type = 'chapter';
                            chapter.grade = grade.name;
                            chapter.subject = subject.name;
                            
                            if (chapter.lessons) {
                                chapter.lessons.forEach(lesson => {
                                    lesson.type = 'lesson';
                                    lesson.grade = grade.name;
                                    lesson.subject = subject.name;
                                    lesson.chapter = chapter.name;
                                });
                            }
                        });
                    } else if (subject.lessons) {
                        subject.lessons.forEach(lesson => {
                            lesson.type = 'lesson';
                            lesson.grade = grade.name;
                            lesson.subject = subject.name;
                        });
                    }
                });
            });
            
            buildTree(data.grades, document.getElementById('tree-container'));
            router();
        })
        .catch(err => console.error('Failed to load data.json:', err));
});

// Listen to hash changes
window.addEventListener('hashchange', router);

