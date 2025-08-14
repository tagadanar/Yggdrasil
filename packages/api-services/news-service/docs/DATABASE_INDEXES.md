# News Service Database Indexing Strategy

## Overview

This document outlines the recommended database indexes for the News Service to ensure optimal performance for common queries and operations.

## Required Indexes

### 1. Search and Filtering Indexes

```javascript
// Compound index for published articles with date sorting
db.newsarticles.createIndex({ isPublished: 1, publishedAt: -1 }, { name: 'idx_published_date' });

// Compound index for category filtering with date sorting
db.newsarticles.createIndex(
  { category: 1, isPublished: 1, publishedAt: -1 },
  { name: 'idx_category_published_date' },
);

// Compound index for pinned articles (priority display)
db.newsarticles.createIndex(
  { isPinned: 1, isPublished: 1, publishedAt: -1 },
  { name: 'idx_pinned_published_date' },
);

// Author filtering index
db.newsarticles.createIndex({ 'author.userId': 1, publishedAt: -1 }, { name: 'idx_author_date' });
```

### 2. Text Search Indexes

```javascript
// Full-text search index for content search
db.newsarticles.createIndex(
  {
    title: 'text',
    content: 'text',
    summary: 'text',
    tags: 'text',
  },
  {
    name: 'idx_fulltext_search',
    weights: {
      title: 10, // Title has highest weight
      summary: 5, // Summary has medium weight
      tags: 3, // Tags have medium-low weight
      content: 1, // Content has lowest weight
    },
    default_language: 'english',
  },
);
```

### 3. Performance Indexes

```javascript
// Slug lookup (unique identifier)
db.newsarticles.createIndex({ slug: 1 }, { name: 'idx_slug', unique: true });

// View count sorting
db.newsarticles.createIndex({ viewCount: -1, isPublished: 1 }, { name: 'idx_viewcount_published' });

// Creation date sorting
db.newsarticles.createIndex({ createdAt: -1 }, { name: 'idx_created_date' });

// Update date sorting
db.newsarticles.createIndex({ updatedAt: -1 }, { name: 'idx_updated_date' });
```

### 4. Tag-based Filtering

```javascript
// Individual tag filtering
db.newsarticles.createIndex(
  { tags: 1, isPublished: 1, publishedAt: -1 },
  { name: 'idx_tags_published_date' },
);
```

## Index Usage Patterns

### Common Query Patterns and Their Indexes

1. **Public Article Listing** (`listArticles` with default filters):
   - Query: `{ isPublished: true }` + sort by `publishedAt: -1`
   - Uses: `idx_published_date`

2. **Category Filtering**:
   - Query: `{ category: "announcements", isPublished: true }` + sort
   - Uses: `idx_category_published_date`

3. **Search Functionality**:
   - Query: `{ $text: { $search: "search terms" } }`
   - Uses: `idx_fulltext_search`

4. **Author Articles**:
   - Query: `{ "author.userId": "userId", isPublished: true }`
   - Uses: `idx_author_date`

5. **Pinned Articles**:
   - Query: `{ isPinned: true, isPublished: true }`
   - Uses: `idx_pinned_published_date`

6. **Popular Articles**:
   - Query: `{ isPublished: true }` + sort by `viewCount: -1`
   - Uses: `idx_viewcount_published`

7. **Article by Slug**:
   - Query: `{ slug: "article-slug" }`
   - Uses: `idx_slug`

## Performance Considerations

### Memory Usage

- Text indexes consume significant memory
- Monitor index size vs. collection size ratio
- Consider partial indexes for large datasets

### Write Performance Impact

- Each index adds overhead to write operations
- Critical for high-frequency article updates
- Monitor insert/update performance after adding indexes

### Compound Index Order

- Most selective fields first in compound indexes
- Filter fields before sort fields
- Follow ESR (Equality, Sort, Range) rule when possible

## Monitoring and Maintenance

### Key Metrics to Monitor

```javascript
// Index usage statistics
db.newsarticles.aggregate([
  { $indexStats: {} }
]);

// Query performance analysis
db.newsarticles.explain("executionStats").find({...});

// Index size monitoring
db.newsarticles.totalIndexSize();
```

### Maintenance Tasks

1. **Weekly**: Check index usage statistics
2. **Monthly**: Analyze slow query logs
3. **Quarterly**: Review and optimize compound indexes
4. **As needed**: Drop unused indexes

## Implementation Script

```javascript
// Run this script in MongoDB to create all recommended indexes
// Note: Run during low-traffic periods as index creation can be resource-intensive

use yggdrasil_production; // or appropriate database name

print("Creating News Service indexes...");

// Core performance indexes
db.newsarticles.createIndex(
  { "isPublished": 1, "publishedAt": -1 },
  { name: "idx_published_date", background: true }
);

db.newsarticles.createIndex(
  { "category": 1, "isPublished": 1, "publishedAt": -1 },
  { name: "idx_category_published_date", background: true }
);

db.newsarticles.createIndex(
  { "isPinned": 1, "isPublished": 1, "publishedAt": -1 },
  { name: "idx_pinned_published_date", background: true }
);

db.newsarticles.createIndex(
  { "author.userId": 1, "publishedAt": -1 },
  { name: "idx_author_date", background: true }
);

db.newsarticles.createIndex(
  { "slug": 1 },
  { name: "idx_slug", unique: true, background: true }
);

db.newsarticles.createIndex(
  { "viewCount": -1, "isPublished": 1 },
  { name: "idx_viewcount_published", background: true }
);

db.newsarticles.createIndex(
  { "tags": 1, "isPublished": 1, "publishedAt": -1 },
  { name: "idx_tags_published_date", background: true }
);

// Full-text search index (create last as it's most resource-intensive)
db.newsarticles.createIndex(
  {
    "title": "text",
    "content": "text",
    "summary": "text",
    "tags": "text"
  },
  {
    name: "idx_fulltext_search",
    background: true,
    weights: {
      "title": 10,
      "summary": 5,
      "tags": 3,
      "content": 1
    },
    default_language: "english"
  }
);

print("Index creation completed!");

// Verify indexes were created
print("Current indexes:");
db.newsarticles.getIndexes().forEach(function(index) {
  print("- " + index.name + ": " + JSON.stringify(index.key));
});
```

## Migration Strategy

### Phase 1: Critical Indexes (Immediate)

- `idx_published_date`
- `idx_slug`
- `idx_fulltext_search`

### Phase 2: Performance Indexes (Week 1)

- `idx_category_published_date`
- `idx_author_date`
- `idx_viewcount_published`

### Phase 3: Enhancement Indexes (Week 2)

- `idx_pinned_published_date`
- `idx_tags_published_date`

### Rollback Plan

```javascript
// Emergency index removal script (if performance issues occur)
db.newsarticles.dropIndex('idx_name_to_remove');
```

## Notes

- All indexes use `background: true` to minimize impact during creation
- Text search index should be created during maintenance window
- Monitor disk space as indexes require additional storage
- Consider partial indexes for very large collections (>1M documents)
