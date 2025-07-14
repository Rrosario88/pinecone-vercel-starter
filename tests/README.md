# PDF RAG Application - Test Suite

This test suite covers the comprehensive PDF RAG application features that were built on top of the Pinecone Vercel starter.

## Test Files Overview

### `pdf-rag-app.spec.ts` - Main Application Tests
- Basic app structure and navigation
- Core interface elements (icons, buttons, panels)
- Modal interactions and functionality
- Theme system integration
- Responsive design verification
- Error handling and empty states

### `pdf-upload.spec.ts` - PDF Upload Functionality
- PDF upload modal behavior
- File input validation and interactions
- Upload area styling and instructions
- File processing states and feedback
- Uploaded files list management

### `web-sources.spec.ts` - Web Sources Management
- Web sources modal functionality
- URL input with https:// prepopulation
- Adding and removing URLs
- Crawl button interactions
- Status indicators and loading states
- Duplicate URL prevention

### `theme-system.spec.ts` - Theme Toggle System
- Light/dark/system theme switching
- Theme persistence across reloads
- Visual state verification
- Mobile theme functionality
- Interface-wide theme application

### `toast-notifications.spec.ts` - Glass-Effect Notifications
- Toast appearance and dismissal
- Different notification types (success, warning, error)
- Auto-dismiss functionality
- Multiple toast stacking
- Mobile toast behavior
- Glass-effect styling verification

## Running Tests

### Prerequisites
Make sure the development server is running:
```bash
npm run dev
```

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npx playwright test tests/pdf-rag-app.spec.ts
```

### Run Tests with UI Mode
```bash
npx playwright test --ui
```

### View Test Report
```bash
npm run test:show
```

## Test Strategy

### What We Test
1. **User Interface Elements**: All major buttons, icons, and interactive elements
2. **Modal Functionality**: Opening, closing, and interactions within modals
3. **Form Interactions**: URL input, file upload, theme selection
4. **Visual Feedback**: Loading states, success indicators, error messages
5. **Responsive Design**: Mobile and desktop layouts
6. **Theme System**: Complete dark/light/system mode functionality
7. **Error Handling**: Graceful degradation and user feedback

### What We Don't Test
1. **API Integration**: Real PDF processing or web crawling (requires backend)
2. **File Upload**: Actual file selection (browser security limitations)
3. **External URLs**: Real web crawling (network dependent)
4. **AI Chat**: OpenAI API responses (requires API keys and costs)

### Test Environment
- **Headless**: Tests run without opening browser windows
- **Cross-Browser**: Chrome, Firefox, and Safari (WebKit)
- **Responsive**: Tests include mobile viewport scenarios
- **Fast**: Focused on UI interactions and visual verification

## Development Notes

### Adding New Tests
When adding new features to the PDF RAG application:

1. **Create feature-specific test files** following the naming pattern
2. **Test user workflows** from start to finish
3. **Verify error states** and edge cases
4. **Include mobile testing** for responsive features
5. **Test theme compatibility** for new UI elements

### Test Best Practices
- **Use descriptive test names** that explain the expected behavior
- **Test user-visible changes** rather than implementation details
- **Group related tests** in describe blocks
- **Use proper waiting** for dynamic content
- **Verify actual user value** delivered by features

### Debugging Failed Tests
1. Run tests with `--headed` flag to see browser
2. Use `--debug` flag to pause execution
3. Check test screenshots in `test-results/` folder
4. Use `page.pause()` to inspect during test execution

## Original Tests
The original Pinecone starter tests have been moved to `example.spec.ts.old` for reference. These tests were designed for the original application before the PDF RAG transformation.