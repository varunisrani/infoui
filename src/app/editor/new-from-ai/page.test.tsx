import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewFromAiPage from './page'; // Adjust path as necessary
import { svgStorage, svgNormalizer } from '@/lib/svg-utils';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('@/lib/svg-utils', () => ({
  svgStorage: {
    saveSVG: jest.fn(),
  },
  svgNormalizer: {
    createDataUrl: jest.fn(),
  },
}));
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(), // Added info for initial load messages
  },
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(), // Added back for the "Back to Dashboard" button
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('NewFromAiPage', () => {
  const mockSvgContent = '<svg><circle cx="50" cy="50" r="40" fill="red" /></svg>';
  const mockSvgName = 'Test AI SVG';
  const mockDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mockSvgContent);

  beforeEach(() => {
    // Clear mocks and localStorage before each test
    jest.clearAllMocks();
    localStorageMock.clear();
    // Mock implementations
    (svgNormalizer.createDataUrl as jest.Mock).mockReturnValue(mockDataUrl);
    (svgStorage.saveSVG as jest.Mock).mockReturnValue({ id: '123', name: mockSvgName, content: mockSvgContent, dataUrl: mockDataUrl, dateAdded: Date.now() });
  });

  test('loads SVG from localStorage and displays it', async () => {
    localStorageMock.setItem('newlyGeneratedSvg', mockSvgContent);
    render(<NewFromAiPage />);

    // Check if SVG content is displayed (preview and textarea)
    await waitFor(() => {
      expect(screen.getByText(/Review Your AI Generated SVG/i)).toBeInTheDocument();
      // Check preview (presence of SVG element might be tricky with dangerouslySetInnerHTML, check container)
      const previewContainer = screen.getByLabelText('SVG Preview Container'); // Add aria-label to preview div for easier selection
      expect(previewContainer).toBeInTheDocument();
      expect(previewContainer.innerHTML).toContain(mockSvgContent);
      
      expect(screen.getByDisplayValue(mockSvgContent)).toBeInTheDocument(); // Textarea
    });
    
    // Check if localStorage item is removed
    expect(localStorageMock.getItem('newlyGeneratedSvg')).toBeNull();
    expect(toast.info).toHaveBeenCalledWith('AI Generated SVG loaded successfully!');
  });

  test('shows message if no SVG is found in localStorage', async () => {
    render(<NewFromAiPage />);
    expect(screen.getByText(/Loading AI Generated SVG.../i)).toBeInTheDocument(); // Initial loading state
    // After useEffect runs:
    await waitFor(() => { // Added await waitFor for async state updates and toast calls
      expect(toast.info).toHaveBeenCalledWith('No new AI SVG found in storage.');
      expect(screen.getByText(/No SVG data found to display./i)).toBeInTheDocument(); // Ensure a message is shown
    });
  });

  test('successfully saves SVG to library', async () => {
    localStorageMock.setItem('newlyGeneratedSvg', mockSvgContent);
    render(<NewFromAiPage />);

    await waitFor(() => {
      // Wait for SVG to load
      expect(screen.getByText(/Review Your AI Generated SVG/i)).toBeInTheDocument();
    });

    // Set SVG name
    const nameInput = screen.getByPlaceholderText(/Enter a name for the SVG/i);
    fireEvent.change(nameInput, { target: { value: mockSvgName } });
    expect(nameInput).toHaveValue(mockSvgName);

    // Click save button
    const saveButton = screen.getByRole('button', { name: /Save to My SVGs/i });
    fireEvent.click(saveButton);

    // Assertions
    expect(svgNormalizer.createDataUrl).toHaveBeenCalledWith(mockSvgContent);
    expect(svgStorage.saveSVG).toHaveBeenCalledWith(mockSvgContent, mockSvgName, mockDataUrl);
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(`SVG "${mockSvgName}" saved successfully!`);
    });
  });

  test('shows error toast if SVG name is empty during save', async () => {
    localStorageMock.setItem('newlyGeneratedSvg', mockSvgContent);
    render(<NewFromAiPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Review Your AI Generated SVG/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Enter a name for the SVG/i);
    fireEvent.change(nameInput, { target: { value: '  ' } }); // Empty name

    const saveButton = screen.getByRole('button', { name: /Save to My SVGs/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('SVG name cannot be empty. Please provide a name.');
    });
    expect(svgStorage.saveSVG).not.toHaveBeenCalled();
  });

  test('shows error toast if saving to library fails', async () => {
    localStorageMock.setItem('newlyGeneratedSvg', mockSvgContent);
    (svgStorage.saveSVG as jest.Mock).mockImplementation(() => {
      throw new Error('Test save error');
    });
    render(<NewFromAiPage />);

    await waitFor(() => {
      expect(screen.getByText(/Review Your AI Generated SVG/i)).toBeInTheDocument();
    });
    
    const nameInput = screen.getByPlaceholderText(/Enter a name for the SVG/i);
    fireEvent.change(nameInput, { target: { value: mockSvgName } });

    const saveButton = screen.getByRole('button', { name: /Save to My SVGs/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save SVG: Test save error');
    });
  });
});
