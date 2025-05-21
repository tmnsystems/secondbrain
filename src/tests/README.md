# SecondBrain Testing Suite

This directory contains tests for the SecondBrain system, ensuring it properly captures Tina's unique teaching style and approach.

## Test Organization

The tests are organized as follows:

- `core/` - Tests for core modules, including content processing, style analysis, and pattern extraction
  - `test_extractors.py` - Tests for metaphor and values extraction modules
  - Additional core module tests...
- Future module tests...

## Running the Tests

You can run all tests using the Python unittest module directly:

```bash
python -m unittest discover -s src/tests
```

For more detailed output:

```bash
python -m unittest discover -s src/tests -v
```

To run a specific test module:

```bash
python -m unittest src.tests.test_simple
```

Alternatively, run individual test files directly:

```bash
python src/tests/test_simple.py
```

## Testing Approach

### Metaphor Extractor Tests

The metaphor extractor tests verify that:

1. The system can identify metaphors and analogies in teaching content
2. The extractor properly categorizes metaphors by domain (nature, sports, building, etc.)
3. The system recognizes holistic metaphors that connect business principles to broader life contexts
4. The repository can store and retrieve metaphors by various criteria

### Values Extractor Tests

The values extractor tests verify that:

1. The system can identify explicit and implicit value statements
2. The extractor properly categorizes values by type (freedom, authenticity, quality of life, etc.)
3. The system recognizes statements about what matters/doesn't matter in business and life
4. The repository can store and retrieve value statements by various criteria

### Integration Tests

The integration tests verify that:

1. The metaphor and values extractors work together to provide a comprehensive view of Tina's teaching approach
2. The holistic, values-driven nature of Tina's teaching is properly captured across both extractors
3. The combined analysis reveals patterns that might not be apparent when using either extractor alone

## Test Data

The tests use both synthetic data and real teaching content from Tina's transcripts to ensure comprehensive coverage of different teaching patterns and styles.