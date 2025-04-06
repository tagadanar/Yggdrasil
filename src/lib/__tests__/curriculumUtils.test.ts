// src/lib/__tests__/curriculumUtils.test.ts
import { 
    transformCurriculumToGraphData, 
    getDirectPrerequisites,
    getDirectDependents
  } from '../curriculumUtils';
  import { Curriculum } from '@/types';
  
  const sampleCurriculum: Curriculum = {
    id: '1',
    programName: 'Test Program',
    years: [
      {
        id: 'y1',
        number: 1,
        title: 'Year 1',
        categories: [
          {
            id: 'cat1',
            name: 'Category 1',
            courses: [
              {
                id: 'course1',
                title: 'Course 1',
                description: 'Description 1',
                prerequisites: [],
                isStartingNode: true
              },
              {
                id: 'course2',
                title: 'Course 2',
                description: 'Description 2',
                prerequisites: ['course1']
              }
            ]
          },
          {
            id: 'cat2',
            name: 'Category 2',
            courses: [
              {
                id: 'course3',
                title: 'Course 3',
                description: 'Description 3',
                prerequisites: ['course1', 'course2']
              },
              {
                id: 'course4',
                title: 'Course 4',
                description: 'Description 4',
                prerequisites: ['course3'],
                isFinalNode: true
              }
            ]
          }
        ]
      }
    ]
  };
  
  describe('curriculumUtils', () => {
    describe('transformCurriculumToGraphData', () => {
      test('transforms curriculum data to graph format', () => {
        const result = transformCurriculumToGraphData(sampleCurriculum);
        
        // Check nodes
        expect(result.nodes).toHaveLength(4);
        expect(result.nodes[0].id).toBe('course1');
        expect(result.nodes[0].isStartingNode).toBe(true);
        
        // Check links
        expect(result.links).toHaveLength(3);
        
        // Check levels are calculated correctly
        expect(result.nodes[0].level).toBe(0); // course1
        expect(result.nodes[1].level).toBe(1); // course2
        expect(result.nodes[2].level).toBe(2); // course3
        expect(result.nodes[3].level).toBe(3); // course4
        
        // Check maxLevel
        expect(result.maxLevel).toBe(3);
        
        // Check indirect prerequisites
        const course4Node = result.nodes.find(n => n.id === 'course4');
        expect(course4Node?.allPrerequisites).toContain('course1');
        expect(course4Node?.allPrerequisites).toContain('course2');
        expect(course4Node?.allPrerequisites).toContain('course3');
      });
    });
    
    describe('getDirectPrerequisites', () => {
      test('gets direct prerequisites for a course', () => {
        const graphData = transformCurriculumToGraphData(sampleCurriculum);
        
        const prereqs = getDirectPrerequisites('course3', graphData);
        expect(prereqs).toHaveLength(2);
        expect(prereqs).toContain('course1');
        expect(prereqs).toContain('course2');
      });
      
      test('returns empty array for course with no prerequisites', () => {
        const graphData = transformCurriculumToGraphData(sampleCurriculum);
        
        const prereqs = getDirectPrerequisites('course1', graphData);
        expect(prereqs).toHaveLength(0);
      });
    });
    
    describe('getDirectDependents', () => {
      test('gets direct dependents for a course', () => {
        const graphData = transformCurriculumToGraphData(sampleCurriculum);
        
        const dependents = getDirectDependents('course1', graphData);
        expect(dependents).toHaveLength(2);
        expect(dependents).toContain('course2');
        expect(dependents).toContain('course3');
      });
      
      test('returns empty array for course with no dependents', () => {
        const graphData = transformCurriculumToGraphData(sampleCurriculum);
        
        const dependents = getDirectDependents('course4', graphData);
        expect(dependents).toHaveLength(0);
      });
    });
  });