document.addEventListener('DOMContentLoaded', function() {
  const slider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');

  // Load saved volume
  chrome.storage.local.get(['volume'], function(result) {
    if (result.volume) {
      slider.value = result.volume;
      volumeValue.textContent = result.volume;
    }
  });

  slider.addEventListener('input', function() {
    const value = this.value;
    volumeValue.textContent = value;
    
    // Save volume setting
    chrome.storage.local.set({volume: value});
    
    // Send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateVolume',
        volume: value
      });
    });
  });
});
