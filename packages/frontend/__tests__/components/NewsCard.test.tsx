// packages/frontend/__tests__/components/NewsCard.test.tsx

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NewsCard } from '../../src/components/news/NewsCard';

describe('NewsCard', () => {
  const mockArticle = {
    id: '1',
    title: 'Test News Article',
    content: '<p>This is the full content of the article with HTML.</p>',
    excerpt: 'This is a short excerpt of the article.',
    category: 'academic',
    tags: ['test', 'news'],
    author: {
      id: 'author1',
      name: 'John Doe',
    },
    publishedAt: '2024-01-15T10:30:00Z',
    isPublished: true,
    isPinned: false,
    viewCount: 42,
  };

  it('renders article information correctly', () => {
    render(<NewsCard article={mockArticle} />);
    
    expect(screen.getByText('Test News Article')).toBeInTheDocument();
    expect(screen.getByText('This is a short excerpt of the article.')).toBeInTheDocument();
    expect(screen.getByText('By John Doe')).toBeInTheDocument();
    expect(screen.getByText('42 views')).toBeInTheDocument();
    expect(screen.getByText('Academic')).toBeInTheDocument();
  });

  it('displays tags correctly', () => {
    render(<NewsCard article={mockArticle} />);
    
    expect(screen.getByText('#test')).toBeInTheDocument();
    expect(screen.getByText('#news')).toBeInTheDocument();
  });

  it('shows pinned indicator for pinned articles', () => {
    const pinnedArticle = { ...mockArticle, isPinned: true };
    render(<NewsCard article={pinnedArticle} />);
    
    // Check for pinned icon (bookmark SVG)
    const pinnedIcon = document.querySelector('svg[viewBox="0 0 24 24"]');
    expect(pinnedIcon).toBeInTheDocument();
  });

  it('shows draft badge for unpublished articles', () => {
    const draftArticle = { ...mockArticle, isPublished: false };
    render(<NewsCard article={draftArticle} />);
    
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders different category colors', () => {
    const categories = [
      { category: 'academic', expectedClass: 'bg-blue-100 text-blue-800' },
      { category: 'general', expectedClass: 'bg-gray-100 text-gray-800' },
      { category: 'facilities', expectedClass: 'bg-green-100 text-green-800' },
      { category: 'events', expectedClass: 'bg-purple-100 text-purple-800' },
    ];

    categories.forEach(({ category, expectedClass }) => {
      const { container } = render(
        <NewsCard article={{ ...mockArticle, category }} />
      );
      
      const categoryBadge = screen.getByText(
        category.charAt(0).toUpperCase() + category.slice(1)
      );
      expect(categoryBadge).toHaveClass(expectedClass.split(' ')[0]); // Just check one class
    });
  });

  it('toggles content display when read more/less is clicked', () => {
    const articleWithDifferentContent = {
      ...mockArticle,
      content: '<p>Full content here</p>',
      excerpt: 'Short excerpt',
    };
    
    render(<NewsCard article={articleWithDifferentContent} />);
    
    expect(screen.getByText('Short excerpt')).toBeInTheDocument();
    expect(screen.getByText('Read more')).toBeInTheDocument();
    
    act(() => {
      fireEvent.click(screen.getByText('Read more'));
    });
    
    expect(screen.queryByText('Short excerpt')).not.toBeInTheDocument();
    expect(screen.getByText('Show less')).toBeInTheDocument();
    
    act(() => {
      fireEvent.click(screen.getByText('Show less'));
    });
    
    expect(screen.getByText('Short excerpt')).toBeInTheDocument();
    expect(screen.getByText('Read more')).toBeInTheDocument();
  });

  it('does not show read more button when content equals excerpt', () => {
    const articleSameContent = {
      ...mockArticle,
      content: mockArticle.excerpt,
    };
    
    render(<NewsCard article={articleSameContent} />);
    
    expect(screen.queryByText('Read more')).not.toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<NewsCard article={mockArticle} onEdit={onEdit} />);
    
    const editButton = screen.getByTitle('Edit article');
    fireEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = jest.fn();
    render(<NewsCard article={mockArticle} onDelete={onDelete} />);
    
    const deleteButton = screen.getByTitle('Delete article');
    fireEvent.click(deleteButton);
    
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not render action buttons when no handlers provided', () => {
    render(<NewsCard article={mockArticle} />);
    
    expect(screen.queryByTitle('Edit article')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete article')).not.toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(<NewsCard article={mockArticle} />);
    
    // Check that some date format is present (exact format may vary by locale)
    expect(screen.getByText(/January.*15.*2024/)).toBeInTheDocument();
  });

  it('does not show view count when not provided', () => {
    const articleWithoutViews = { ...mockArticle };
    delete articleWithoutViews.viewCount;
    
    render(<NewsCard article={articleWithoutViews} />);
    
    expect(screen.queryByText(/views/)).not.toBeInTheDocument();
  });

  it('does not render tags section when no tags provided', () => {
    const articleWithoutTags = { ...mockArticle, tags: [] };
    render(<NewsCard article={articleWithoutTags} />);
    
    expect(screen.queryByText('#test')).not.toBeInTheDocument();
  });
});