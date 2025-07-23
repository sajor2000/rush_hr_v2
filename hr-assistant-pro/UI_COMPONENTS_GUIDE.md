# UI Components Guide - HR Assistant Pro

## Quick Start for Developers

This guide provides an overview of the new UI components and how to implement them in your development workflow.

## 🎨 Available Components

### 1. Enhanced Header
```tsx
import EnhancedHeader from '@/components/EnhancedHeader';

// Basic usage
<EnhancedHeader />

// With custom props
<EnhancedHeader 
  title="Custom Title"
  subtitle="Custom subtitle"
  showNavigation={false}
/>
```

**Props:**
- `title?: string` - Custom header title
- `subtitle?: string` - Custom subtitle
- `showNavigation?: boolean` - Show/hide navigation menu

### 2. Enhanced Loading
```tsx
import EnhancedLoading, { CompactLoading, SkeletonCard } from '@/components/EnhancedLoading';

// Full-screen loading overlay
<EnhancedLoading
  isVisible={isLoading}
  progress={75}
  statusMessage="Processing resumes..."
  onCancel={() => setLoading(false)}
/>

// Compact loading for inline use
<CompactLoading message="Loading data..." />

// Skeleton loading for content placeholders
<SkeletonCard />
```

**Props for EnhancedLoading:**
- `isVisible: boolean` - Show/hide the loading overlay
- `progress?: number` - Progress percentage (0-100)
- `statusMessage?: string` - Current status message
- `onCancel?: () => void` - Cancel function

### 3. Enhanced Results Visualization
```tsx
import EnhancedResultsVisualization from '@/components/EnhancedResultsVisualization';

<EnhancedResultsVisualization 
  results={evaluationResults}
  jobRequirements={jobRequirements}
/>
```

**Props:**
- `results: EvaluationResult[]` - Array of evaluation results
- `jobRequirements?: any` - Job requirements object

## 🎯 CSS Classes

### Button Classes
```css
.btn-primary    /* Primary action button */
.btn-secondary  /* Secondary action button */
.btn-ghost      /* Ghost/outline button */
```

### Card Classes
```css
.card           /* Basic card styling */
.card-hover     /* Card with hover effects */
```

### Input Classes
```css
.input-field    /* Enhanced input styling */
```

### Loading Classes
```css
.loading-dots   /* Animated loading dots */
.progress-bar   /* Progress bar container */
.progress-bar-fill /* Progress bar fill */
```

### Utility Classes
```css
.text-gradient  /* Gradient text effect */
.glass          /* Glass morphism effect */
.float          /* Floating animation */
.pulse-gentle   /* Gentle pulse animation */
.slide-in-left  /* Slide in from left */
.slide-in-right /* Slide in from right */
```

## 🎨 Color System

### Primary Colors
```css
--rush-green: #004E25
--rush-green-dark: #004E25
--rush-blue: #00729A
--rush-blue-dark: #005A7B
--rush-charcoal: #414042
```

### Neutral Colors
```css
--neutral-gray-lightest: #F8F9FA
--neutral-gray-light: #E9ECEF
--neutral-gray: #CED4DA
--neutral-gray-dark: #6C757D
```

### Status Colors
```css
.badge-success  /* Green - Success states */
.badge-warning  /* Yellow - Warning states */
.badge-error    /* Red - Error states */
.badge-info     /* Blue - Info states */
```

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile first approach */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
```

### Responsive Utilities
```css
.text-responsive  /* Responsive text sizing */
```

## 🎭 Animation System

### Transitions
All interactive elements use consistent transitions:
```css
transition-all duration-200  /* Standard transition */
transition-all duration-300  /* Longer transition for cards */
```

### Keyframe Animations
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
```

## 🔧 Implementation Examples

### 1. Form with Enhanced Styling
```tsx
<div className="card p-6">
  <h2 className="text-xl font-semibold text-rush-green mb-4">Form Title</h2>
  
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Input Label
  </label>
  
  <input 
    type="text"
    className="input-field"
    placeholder="Enter value..."
  />
  
  <button className="btn-primary mt-4">
    Submit
  </button>
</div>
```

### 2. Loading State Implementation
```tsx
const [isLoading, setIsLoading] = useState(false);
const [progress, setProgress] = useState(0);

// In your component
{isLoading && (
  <EnhancedLoading
    isVisible={isLoading}
    progress={progress}
    statusMessage="Processing your request..."
    onCancel={() => setIsLoading(false)}
  />
)}
```

### 3. Results Display
```tsx
{evaluationResults.length > 0 && (
  <div className="space-y-6">
    <EnhancedResultsVisualization 
      results={evaluationResults}
      jobRequirements={jobRequirements}
    />
    
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">Detailed Results</h3>
      {/* Your detailed results content */}
    </div>
  </div>
)}
```

## 🎨 Customization

### Theme Colors
To customize colors, modify the Tailwind config:
```javascript
// tailwind.config.ts
colors: {
  'rush-green': {
    light: '#E6F5F1',
    DEFAULT: '#004E25',
    dark: '#004E25',
  },
  // Add your custom colors here
}
```

### Component Styling
To customize component styles, modify the CSS classes in `globals.css`:
```css
@layer components {
  .btn-primary {
    @apply px-6 py-3 bg-rush-green text-white font-semibold rounded-lg;
    /* Add your custom styles */
  }
}
```

## 🚀 Best Practices

### 1. Component Usage
- Use semantic HTML elements
- Include proper ARIA labels
- Implement keyboard navigation
- Test on multiple screen sizes

### 2. Performance
- Use CSS transforms for animations
- Implement lazy loading for heavy components
- Optimize images and assets
- Minimize re-renders

### 3. Accessibility
- Maintain proper color contrast
- Include focus indicators
- Use semantic markup
- Test with screen readers

### 4. Mobile Optimization
- Use touch-friendly target sizes (44px minimum)
- Implement responsive breakpoints
- Optimize for mobile performance
- Test on actual devices

## 🔍 Debugging

### Common Issues
1. **Icons not showing**: Check Heroicons import paths
2. **Animations not working**: Ensure CSS classes are applied
3. **Responsive issues**: Verify breakpoint usage
4. **Color inconsistencies**: Check Tailwind config

### Development Tools
- Use browser dev tools for CSS debugging
- Implement React DevTools for component inspection
- Use Lighthouse for performance and accessibility testing

## 📚 Additional Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Heroicons Documentation](https://heroicons.com/)
- [Recharts Documentation](https://recharts.org/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

*This guide should be updated as new components and features are added to the system.* 