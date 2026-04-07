let lastChecked;

//select all checkbox logic
function toggleAll(masterCheckbox) {
            const checkboxes = document.querySelectorAll('.record-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = masterCheckbox.checked;
            });
        }
//shift click logic
function handleShiftClick(e) {
    let inBetween = false;
    if (e.shiftKey && lastChecked && lastChecked !== this) {
        const checkboxes = Array.from(document.querySelectorAll('.record-checkbox'));
        checkboxes.forEach(cb => {
            if (cb === this || cb === lastChecked) {
                inBetween = !inBetween;
            }
            if (inBetween) {
                cb.checked = this.checked;
            }
        });
    }
    lastChecked = this;
}


function getSelectedIDs() {
    const selected = document.querySelectorAll('.record-checkbox:checked');
    const ids = Array.from(selected).map(cb => cb.value);
    console.log("Selected IDs:", ids);
    return ids;
}
//copy prop codes to clipboard logic
function copySelectedToClipboard(btn) {
    const selectedCheckboxes = document.querySelectorAll('.record-checkbox:checked');

    if (selectedCheckboxes.length === 0) {
        alert("No prop codes selected");
        return;
    }

    const headers = Array.from(document.querySelectorAll('table thead th'));
    const propCodeIndex = headers.findIndex(th => {
        const text = th.textContent.trim().toLowerCase()
        return text.includes('prop') && text.includes('code');
    });

    if (propCodeIndex === -1) {
        alert("Prop Code column not found");
        return;
    }

    let propCodeList = [];
    selectedCheckboxes.forEach(cb => {
        const row = cb.closest('tr');
        const cells = row.querySelectorAll('td');
        const propCode = cells[propCodeIndex].innerText.trim();
        if (propCode) propCodeList.push(propCode);
    });

    const finalString = propCodeList.join('\n');

    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(finalString, btn);
        return;
    }

    navigator.clipboard.writeText(finalString).then(() => {
        showSuccess(btn);
    }).catch(err => {
        console.warn('Clipboard API failed, falling back to textarea method', err);
        fallbackCopyTextToClipboard(finalString, btn);
    })
}
// helper button to show clipboard copy success
function showSuccess(btn) {
    const originalText = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}
//fallback method for clipboard copy for older browsers
function fallbackCopyTextToClipboard(text, btn) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showSuccess(btn);
        } else {
            alert("Failed to copy to clipboard");
        }
    } catch (err) {
        alert('Fallback copy failed: ', err);
    }
    document.body.removeChild(textarea);
}
//runs on page load to initialize checkbox event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.record-checkbox').forEach(cb => {
        cb.addEventListener('click', handleShiftClick);
    });
});

let searchTimer;
function debouncedSearch(val) {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('q', val);
        url.searchParams.set('page', 1);
        window.location.href = url.href;
    }, 500);
}
function clearSearch() {
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    url.searchParams.set('page', 1);
    window.location.href = url.href;
}
document.getElementById('global-search').addEventListener('keydown', function(e) {
    if (e.key === "Escape") {
        clearSearch();
    }
});
function openNav() {
    document.getElementById("mySidebar").style.width = "250px";
    document.getElementById("main").style.marginLeft = "250px";
    }

function closeNav() {
    document.getElementById("mySidebar").style.width = "0";
    document.getElementById("main").style.marginLeft = "0";
    }




const dropdown = document.getElementsByClassName("dropdown-btn");

for (let i = 0; i < dropdown.length; i++) {
  dropdown[i].addEventListener("click", function() {
    this.classList.toggle("active");
    const dropdownContent = this.nextElementSibling;
    dropdownContent.style.display = (dropdownContent.style.display === "block") ? "none" : "block";
  });
}

window.addEventListener('click', function(e) {
  const sidebar = document.getElementById("mySidebar");
  const openBtn = document.querySelector(".openbtn");

  if (!sidebar.contains(e.target) && !openBtn.contains(e.target)) {
    if (sidebar.style.width === "250px") {
      closeNav();
    }
  }
});