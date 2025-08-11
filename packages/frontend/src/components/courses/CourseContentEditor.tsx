// packages/frontend/src/components/courses/CourseContentEditor.tsx
// Inline course content editing component for chapters, sections, and content

'use client';

import React, { useState, useEffect } from 'react';
import { courseApi } from '@/lib/api/courses';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Chapter {
  _id?: string;
  title: string;
  description?: string;
  order: number;
  sections: Section[];
  isPublished: boolean;
  estimatedDuration: number;
}

interface Section {
  _id?: string;
  title: string;
  description?: string;
  order: number;
  content: ContentItem[];
  isPublished: boolean;
  estimatedDuration: number;
}

interface ContentItem {
  _id?: string;
  type: 'text' | 'video' | 'exercise' | 'quiz' | 'file';
  title?: string;
  order: number;
  data: any;
  isPublished: boolean;
}

interface CourseContentEditorProps {
  courseId: string;
  chapters: Chapter[];
  onContentUpdate: (chapters: Chapter[]) => void;
  canEdit?: boolean;
}

export const CourseContentEditor: React.FC<CourseContentEditorProps> = ({
  courseId,
  chapters: initialChapters,
  onContentUpdate,
  canEdit = true,
}) => {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setChapters(initialChapters);
  }, [initialChapters]);

  const addChapter = () => {
    const newChapter: Chapter = {
      title: '',
      description: '',
      order: chapters.length + 1,
      sections: [],
      isPublished: false,
      estimatedDuration: 60,
    };

    const updatedChapters = [...chapters, newChapter];
    setChapters(updatedChapters);
    onContentUpdate(updatedChapters);

    // Start editing the new chapter
    const tempId = `new-chapter-${Date.now()}`;
    setEditingChapter(tempId);
  };

  const updateChapter = (index: number, updates: Partial<Chapter>) => {
    const updatedChapters = chapters.map((chapter, i) =>
      i === index ? { ...chapter, ...updates } : chapter,
    );
    setChapters(updatedChapters);
    onContentUpdate(updatedChapters);
  };

  const deleteChapter = (index: number) => {
    const updatedChapters = chapters.filter((_, i) => i !== index);
    setChapters(updatedChapters);
    onContentUpdate(updatedChapters);
  };

  const addSection = (chapterIndex: number) => {
    const newSection: Section = {
      title: '',
      description: '',
      order: chapters[chapterIndex].sections.length + 1,
      content: [],
      isPublished: false,
      estimatedDuration: 30,
    };

    const updatedChapters = chapters.map((chapter, i) =>
      i === chapterIndex
        ? { ...chapter, sections: [...chapter.sections, newSection] }
        : chapter,
    );

    setChapters(updatedChapters);
    onContentUpdate(updatedChapters);

    // Start editing the new section
    const tempId = `new-section-${Date.now()}`;
    setEditingSection(tempId);
  };

  const updateSection = (chapterIndex: number, sectionIndex: number, updates: Partial<Section>) => {
    const updatedChapters = chapters.map((chapter, i) =>
      i === chapterIndex
        ? {
            ...chapter,
            sections: chapter.sections.map((section, j) =>
              j === sectionIndex ? { ...section, ...updates } : section,
            ),
          }
        : chapter,
    );
    setChapters(updatedChapters);
    onContentUpdate(updatedChapters);
  };

  const deleteSection = (chapterIndex: number, sectionIndex: number) => {
    const updatedChapters = chapters.map((chapter, i) =>
      i === chapterIndex
        ? {
            ...chapter,
            sections: chapter.sections.filter((_, j) => j !== sectionIndex),
          }
        : chapter,
    );
    setChapters(updatedChapters);
    onContentUpdate(updatedChapters);
  };

  const addContent = (chapterIndex: number, sectionIndex: number, contentType: ContentItem['type']) => {
    const newContent: ContentItem = {
      type: contentType,
      title: `New ${contentType}`,
      order: chapters[chapterIndex].sections[sectionIndex].content.length + 1,
      data: getDefaultContentData(contentType),
      isPublished: false,
    };

    const updatedChapters = chapters.map((chapter, i) =>
      i === chapterIndex
        ? {
            ...chapter,
            sections: chapter.sections.map((section, j) =>
              j === sectionIndex
                ? { ...section, content: [...section.content, newContent] }
                : section,
            ),
          }
        : chapter,
    );

    setChapters(updatedChapters);
    onContentUpdate(updatedChapters);
  };

  const getDefaultContentData = (type: ContentItem['type']) => {
    switch (type) {
      case 'text':
        return { content: 'Enter your text content here...' };
      case 'video':
        return { url: '', title: '', description: '' };
      case 'exercise':
        return {
          instructions: 'Write a function that...',
          starterCode: 'function solution() {\n  // Your code here\n}',
          testCases: 'test("should work", () => {\n  expect(solution()).toBe(expected);\n});',
        };
      case 'quiz':
        return {
          question: 'Enter your question here',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'Explanation of the correct answer',
        };
      case 'file':
        return { url: '', name: '', description: '' };
      default:
        return {};
    }
  };

  const toggleChapter = (chapterId: string | number) => {
    const id = chapterId.toString();
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedChapters(newExpanded);
  };

  const toggleSection = (sectionId: string | number) => {
    const id = sectionId.toString();
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  if (!canEdit) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You don't have permission to edit this course content.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Chapter Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Course Content</h3>
        <button
          onClick={addChapter}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          data-testid="add-chapter-btn"
        >
          <PlusIcon className="w-4 h-4" />
          Add Chapter
        </button>
      </div>

      {/* Chapters */}
      <div className="space-y-3">
        {chapters.map((chapter, chapterIndex) => (
          <div key={chapter._id || chapterIndex} className="border rounded-lg bg-white">
            {/* Chapter Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => toggleChapter(chapter._id || chapterIndex)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {expandedChapters.has((chapter._id || chapterIndex).toString()) ? (
                    <ChevronDownIcon className="w-5 h-5" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5" />
                  )}
                </button>

                {editingChapter === (chapter._id || `new-chapter-${chapterIndex}`) ? (
                  <input
                    type="text"
                    placeholder="Chapter title"
                    value={chapter.title}
                    onChange={(e) => updateChapter(chapterIndex, { title: e.target.value })}
                    onBlur={() => setEditingChapter(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingChapter(null)}
                    className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Chapter title"
                    data-testid="chapter-title-input"
                    autoFocus
                  />
                ) : (
                  <span
                    className="font-medium text-gray-900 cursor-pointer"
                    onClick={() => setEditingChapter(chapter._id || `new-chapter-${chapterIndex}`)}
                  >
                    Chapter {chapterIndex + 1}: {chapter.title || 'Untitled Chapter'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {chapter.sections.length} sections
                </span>
                <button
                  onClick={() => deleteChapter(chapterIndex)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Delete chapter"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chapter Content - Expanded */}
            {expandedChapters.has((chapter._id || chapterIndex).toString()) && (
              <div className="p-4 space-y-3">
                {/* Chapter Description */}
                <textarea
                  placeholder="Chapter description (optional)"
                  value={chapter.description || ''}
                  onChange={(e) => updateChapter(chapterIndex, { description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={2}
                />

                {/* Add Section Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => addSection(chapterIndex)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                    data-testid="add-section-btn"
                  >
                    <PlusIcon className="w-3 h-3" />
                    Add Section
                  </button>
                </div>

                {/* Sections */}
                <div className="space-y-2 ml-6">
                  {chapter.sections.map((section, sectionIndex) => (
                    <div key={section._id || sectionIndex} className="border border-gray-200 rounded bg-gray-50">
                      {/* Section Header */}
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2 flex-1">
                          <button
                            onClick={() => toggleSection(section._id || `${chapterIndex}-${sectionIndex}`)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {expandedSections.has((section._id || `${chapterIndex}-${sectionIndex}`).toString()) ? (
                              <ChevronDownIcon className="w-4 h-4" />
                            ) : (
                              <ChevronRightIcon className="w-4 h-4" />
                            )}
                          </button>

                          {editingSection === (section._id || `new-section-${chapterIndex}-${sectionIndex}`) ? (
                            <input
                              type="text"
                              placeholder="Section title"
                              value={section.title}
                              onChange={(e) => updateSection(chapterIndex, sectionIndex, { title: e.target.value })}
                              onBlur={() => setEditingSection(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingSection(null)}
                              className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              data-testid="section-title-input"
                              autoFocus
                            />
                          ) : (
                            <span
                              className="text-sm font-medium text-gray-800 cursor-pointer"
                              onClick={() => setEditingSection(section._id || `new-section-${chapterIndex}-${sectionIndex}`)}
                            >
                              {chapterIndex + 1}.{sectionIndex + 1} {section.title || 'Untitled Section'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {section.content.length} items
                          </span>
                          <button
                            onClick={() => deleteSection(chapterIndex, sectionIndex)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Delete section"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Section Content - Expanded */}
                      {expandedSections.has((section._id || `${chapterIndex}-${sectionIndex}`).toString()) && (
                        <div className="p-3 border-t border-gray-200 space-y-2">
                          {/* Section Description */}
                          <textarea
                            placeholder="Section description (optional)"
                            value={section.description || ''}
                            onChange={(e) => updateSection(chapterIndex, sectionIndex, { description: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            rows={1}
                          />

                          {/* Add Content Buttons */}
                          <div className="flex flex-wrap gap-1">
                            {(['text', 'video', 'exercise', 'quiz', 'file'] as const).map((contentType) => (
                              <button
                                key={contentType}
                                onClick={() => addContent(chapterIndex, sectionIndex, contentType)}
                                className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200 capitalize"
                                data-testid={`add-${contentType}-btn`}
                              >
                                Add {contentType}
                              </button>
                            ))}
                          </div>

                          {/* Content Items */}
                          {section.content.length > 0 && (
                            <div className="space-y-1 ml-4">
                              {section.content.map((content, contentIndex) => (
                                <div key={content._id || contentIndex} className="flex items-center gap-2 p-2 bg-white border rounded text-xs">
                                  <span className="text-gray-500">
                                    {content.type === 'text' && '📄'}
                                    {content.type === 'video' && '🎥'}
                                    {content.type === 'exercise' && '💻'}
                                    {content.type === 'quiz' && '❓'}
                                    {content.type === 'file' && '📎'}
                                  </span>
                                  <span className="flex-1">{content.title}</span>
                                  <span className="text-gray-400 capitalize">{content.type}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {chapters.length === 0 && (
        <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-gray-500 mb-4">No chapters added yet.</p>
          <button
            onClick={addChapter}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add your first chapter
          </button>
        </div>
      )}
    </div>
  );
};

export default CourseContentEditor;
