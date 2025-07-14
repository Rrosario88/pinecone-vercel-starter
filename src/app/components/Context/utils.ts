import { IUrlEntry } from "./UrlButton";
import { ICard } from "./Card";

export async function crawlDocument(
  url: string,
  setEntries: React.Dispatch<React.SetStateAction<IUrlEntry[]>>,
  setCards: React.Dispatch<React.SetStateAction<ICard[]>>,
  splittingMethod: string,
  chunkSize: number,
  overlap: number,
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => void
): Promise<void> {
  // Check if URL is already seeded
  let alreadySeeded = false;
  setEntries((prevEntries: IUrlEntry[]) => {
    alreadySeeded = prevEntries.some((entry: IUrlEntry) => entry.url === url && entry.seeded);
    if (alreadySeeded) {
      return prevEntries; // Don't modify if already seeded
    }
    // Set loading state
    return prevEntries.map((seed: IUrlEntry) =>
      seed.url === url ? { ...seed, loading: true } : seed
    );
  });

  // If already seeded, show message and return early
  if (alreadySeeded) {
    if (showToast) {
      showToast(`URL "${url}" has already been crawled and indexed`, 'info');
    } else {
      console.log(`URL "${url}" has already been crawled and indexed`);
    }
    return;
  }

  try {
    const response = await fetch("/api/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        options: {
          splittingMethod,
          chunkSize,
          overlap,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const { documents } = await response.json();

    if (documents && documents.length > 0) {
      setCards(prevCards => [...prevCards, ...documents]);
      
      // Mark as seeded
      setEntries((prevEntries: IUrlEntry[]) =>
        prevEntries.map((entry: IUrlEntry) =>
          entry.url === url ? { ...entry, seeded: true, loading: false } : entry
        )
      );

      if (showToast) {
        showToast('Successfully crawled website content', 'success');
      }
    } else {
      // Reset loading state
      setEntries((prevEntries: IUrlEntry[]) =>
        prevEntries.map((entry: IUrlEntry) =>
          entry.url === url ? { ...entry, loading: false } : entry
        )
      );

      const message = 'No content could be extracted from this URL. The website might be empty or blocked.';
      if (showToast) {
        showToast(message, 'warning');
      } else {
        console.warn(message);
      }
    }
  } catch (error) {
    console.error('Web crawl error:', error);
    
    // Reset loading state
    setEntries((prevEntries: IUrlEntry[]) =>
      prevEntries.map((entry: IUrlEntry) =>
        entry.url === url ? { ...entry, loading: false } : entry
      )
    );

    // Provide more specific error messages
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    let errorMessage = 'Failed to crawl website. Please check the URL and try again.';
    if (errorMsg.includes('Failed to fetch')) {
      errorMessage = 'Connection failed. Please check your internet connection and try again.';
    } else if (errorMsg.includes('404')) {
      errorMessage = 'Website not found. Please check if the URL is correct.';
    } else if (errorMsg.includes('403') || errorMsg.includes('401')) {
      errorMessage = 'Access denied. The website may be protected or require authentication.';
    } else if (errorMsg.includes('500')) {
      errorMessage = 'Server error occurred. Please try again in a moment.';
    } else if (errorMsg.includes('timeout')) {
      errorMessage = 'Request timed out. The website may be slow to respond.';
    }

    if (showToast) {
      showToast(errorMessage, 'error');
    } else {
      // Fallback to console.error if no toast function provided
      console.error(errorMessage);
      // Show a basic alert as last resort for debugging
      alert(errorMessage);
    }
  }
}

export async function clearIndex(
  setEntries: React.Dispatch<React.SetStateAction<IUrlEntry[]>>,
  setCards: React.Dispatch<React.SetStateAction<ICard[]>>,
  setStatusMessage?: (message: string) => void,
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => void
) {
  try {
    const response = await fetch("/api/clearIndex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();

    if (response.ok) {
      setEntries((prevEntries: IUrlEntry[]) =>
        prevEntries.map((entry: IUrlEntry) => ({
          ...entry,
          seeded: false,
          loading: false,
        }))
      );
      setCards([]);
      
      // Show friendly toast notification
      if (showToast) {
        if (result.message?.includes('PDF: false') && result.message?.includes('Default: false')) {
          showToast('Documents already cleared', 'info');
        } else {
          showToast('Documents cleared successfully', 'success');
        }
      } else if (setStatusMessage) {
        // Fallback to status message if toast not available
        if (result.message?.includes('PDF: false') && result.message?.includes('Default: false')) {
          setStatusMessage('Documents already cleared');
        } else {
          setStatusMessage('Documents cleared successfully');
        }
      }
      
      console.log('Documents cleared:', result.message);
    } else {
      console.error('Failed to clear documents:', result.error);
      if (showToast) {
        showToast('Unable to clear documents', 'error');
      } else if (setStatusMessage) {
        setStatusMessage('Unable to clear documents');
      }
    }
  } catch (error) {
    console.error('Error clearing documents:', error);
    if (showToast) {
      showToast('Connection error occurred', 'error');
    } else if (setStatusMessage) {
      setStatusMessage('Connection error occurred');
    }
  }
}