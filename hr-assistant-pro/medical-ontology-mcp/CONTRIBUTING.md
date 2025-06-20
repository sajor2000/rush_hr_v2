# Contributing to Medical Ontology MCP Server

Thank you for your interest in contributing to the Medical Ontology MCP Server! This document provides guidelines and information for contributors.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [How to Contribute](#how-to-contribute)
4. [Development Setup](#development-setup)
5. [Coding Standards](#coding-standards)
6. [Testing](#testing)
7. [Documentation](#documentation)
8. [Submitting Changes](#submitting-changes)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read and follow our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/medical-ontology-mcp.git
   cd medical-ontology-mcp
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/originalowner/medical-ontology-mcp.git
   ```

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- System information (OS, Python version)
- Relevant logs or error messages

### Suggesting Enhancements

Enhancement suggestions are welcome! Please include:

- A clear and descriptive title
- Detailed description of the proposed feature
- Use cases and benefits
- Possible implementation approach

### Contributing Code

1. **Find an issue** to work on or create a new one
2. **Comment** on the issue to let others know you're working on it
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Python 3.8 or higher
- Git
- Virtual environment tool (venv, conda, etc.)

### Setup Development Environment

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install development dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Install pre-commit hooks
pre-commit install
```

### Development Dependencies

```txt
# requirements-dev.txt
pytest>=7.4.0
pytest-asyncio>=0.21.0
pytest-cov>=4.1.0
black>=23.12.0
ruff>=0.1.0
mypy>=1.8.0
pre-commit>=3.5.0
```

## Coding Standards

### Python Style Guide

We follow PEP 8 with some modifications:

- Line length: 88 characters (Black default)
- Use type hints where possible
- Docstrings for all public functions/classes

### Code Formatting

We use Black for code formatting:

```bash
# Format code
black src/ tests/

# Check formatting
black --check src/ tests/
```

### Linting

We use Ruff for linting:

```bash
# Run linter
ruff src/ tests/

# Fix auto-fixable issues
ruff --fix src/ tests/
```

### Type Checking

We use MyPy for type checking:

```bash
mypy src/
```

### Example Code Style

```python
"""Module docstring explaining purpose."""

from typing import Dict, List, Optional

import logging

logger = logging.getLogger(__name__)


class ExampleClass:
    """Class docstring explaining purpose and usage."""
    
    def __init__(self, config: Dict[str, Any]) -> None:
        """Initialize with configuration.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
    
    async def process_data(
        self,
        data: List[str],
        options: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Process data with optional parameters.
        
        Args:
            data: List of items to process
            options: Optional processing options
            
        Returns:
            List of processed results
            
        Raises:
            ValueError: If data is empty
        """
        if not data:
            raise ValueError("Data cannot be empty")
        
        # Implementation here
        return []
```

## Testing

### Writing Tests

- Write tests for all new functionality
- Maintain or improve code coverage
- Use descriptive test names

### Test Structure

```python
# tests/test_example.py
import pytest
from unittest.mock import Mock, patch

from src.module import ExampleClass


class TestExampleClass:
    """Test cases for ExampleClass."""
    
    @pytest.fixture
    def example_instance(self):
        """Create instance for testing."""
        config = {"key": "value"}
        return ExampleClass(config)
    
    def test_initialization(self, example_instance):
        """Test proper initialization."""
        assert example_instance.config == {"key": "value"}
    
    @pytest.mark.asyncio
    async def test_process_data_empty(self, example_instance):
        """Test processing with empty data raises error."""
        with pytest.raises(ValueError, match="Data cannot be empty"):
            await example_instance.process_data([])
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_example.py

# Run with verbose output
pytest -v
```

## Documentation

### Docstring Format

We use Google-style docstrings:

```python
def example_function(param1: str, param2: int = 0) -> Dict[str, Any]:
    """Brief description of function.
    
    Longer description if needed, explaining behavior,
    assumptions, and important details.
    
    Args:
        param1: Description of param1
        param2: Description of param2, defaults to 0
        
    Returns:
        Description of return value
        
    Raises:
        ValueError: When param1 is empty
        TypeError: When param2 is not an integer
        
    Example:
        >>> result = example_function("test", 42)
        >>> print(result)
        {'status': 'success', 'value': 42}
    """
    pass
```

### Updating Documentation

- Update README.md for user-facing changes
- Update API documentation for new endpoints/tools
- Add examples for new features
- Update troubleshooting guide for known issues

## Submitting Changes

### Commit Messages

Follow conventional commit format:

```
type(scope): brief description

Longer explanation if needed. Wrap at 72 characters.

Fixes #123
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Maintenance tasks

### Pull Request Process

1. **Update your fork**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request**:
   - Use a clear, descriptive title
   - Reference related issues
   - Describe what changes were made and why
   - Include screenshots for UI changes
   - Ensure all tests pass

### Pull Request Template

```markdown
## Description
Brief description of changes

## Related Issues
Fixes #123
Related to #456

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Updated existing tests

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

## Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged

## Recognition

Contributors will be recognized in:
- The project README
- Release notes
- Annual contributor reports

## Questions?

Feel free to:
- Open a discussion on GitHub
- Join our community chat
- Email the maintainers

Thank you for contributing to making medical ontology access better for researchers!