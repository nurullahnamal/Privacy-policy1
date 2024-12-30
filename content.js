// Keep track of media elements and their gain nodes
const processedMedia = new WeakMap();
let currentVolume = 100;

function createGainNode(media) {
  try {
    // Eğer zaten bir AudioContext varsa onu kullan
    if (!window.audioContext) {
      window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const source = window.audioContext.createMediaElementSource(media);
    const gainNode = window.audioContext.createGain();
    
    // Bağlantıları kur
    source.connect(gainNode);
    gainNode.connect(window.audioContext.destination);
    
    // Başlangıç ses seviyesini ayarla
    gainNode.gain.value = currentVolume / 100;
    
    return gainNode;
  } catch (error) {
    console.error('Error creating audio context:', error);
    return null;
  }
}

function boostVolume(volume) {
  currentVolume = volume;
  
  const mediaElements = document.querySelectorAll('video, audio');
  mediaElements.forEach(media => {
    try {
      if (!processedMedia.has(media)) {
        // AudioContext'i hemen oluştur
        const gainNode = createGainNode(media);
        if (gainNode) {
          processedMedia.set(media, gainNode);
          // Ses seviyesini 0.1 (10%) ile 4.0 (400%) arasında ayarla
          const normalizedVolume = Math.max(0.1, Math.min(4.0, volume / 100));
          gainNode.gain.value = normalizedVolume;
          
          // Orijinal ses kontrolünü devre dışı bırak
          let originalVolume = media.volume;
          Object.defineProperty(media, 'volume', {
            get: () => originalVolume,
            set: (v) => {
              originalVolume = v;
              const boostedVolume = (currentVolume / 100) * v;
              // Ses seviyesini 0.1 ile 4.0 arasında sınırla
              gainNode.gain.value = Math.max(0.1, Math.min(4.0, boostedVolume));
            }
          });
        }
      } else {
        // Var olan gain node'u güncelle
        const gainNode = processedMedia.get(media);
        if (gainNode) {
          // Ses seviyesini 0.1 ile 4.0 arasında sınırla
          const normalizedVolume = Math.max(0.1, Math.min(4.0, volume / 100));
          gainNode.gain.value = normalizedVolume;
        }
      }
    } catch (error) {
      console.error('Error processing media element:', error);
    }
  });
}

// Sayfa yüklendiğinde ve yeni medya eklendiğinde çalışacak fonksiyon
function initializeAudioContext() {
  // Kullanıcı etkileşimi gerektiren bir olay dinleyicisi ekle
  const initAudio = () => {
    if (!window.audioContext) {
      window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    document.removeEventListener('click', initAudio);
    document.removeEventListener('keydown', initAudio);
    
    // Kaydedilmiş ses seviyesini al ve uygula
    chrome.storage.local.get(['volume'], (result) => {
      if (result.volume) {
        boostVolume(result.volume);
      }
    });
  };

  document.addEventListener('click', initAudio);
  document.addEventListener('keydown', initAudio);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateVolume') {
    boostVolume(request.volume);
  }
});

// Initial setup
initializeAudioContext();

// Watch for dynamically added media elements
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      chrome.storage.local.get(['volume'], (result) => {
        if (result.volume) {
          boostVolume(result.volume);
        }
      });
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Sayfadan ayrılırken temizlik yap
window.addEventListener('beforeunload', () => {
  if (window.audioContext) {
    window.audioContext.close();
  }
});
