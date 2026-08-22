import type { GeneratorState } from '../types';

export interface ProfilePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge: string;
  state: Partial<GeneratorState>;
}

export const PROFILE_PRESETS: ProfilePreset[] = [
  {
    id: 'fullstack',
    name: 'Full-Stack Developer',
    description: 'Modern web apps, APIs, and databases',
    icon: '⚡',
    badge: 'Popular',
    state: {
      name: 'a Full-Stack Developer',
      description:
        'Building scalable web applications, modern APIs, and high-performance user experiences.',
      techs: [
        'JavaScript',
        'TypeScript',
        'React',
        'Next.js',
        'Node.js',
        'Tailwind CSS',
        'MongoDB',
        'PostgreSQL',
        'Docker',
        'Git',
      ],
      socials: ['GitHub', 'LinkedIn', 'X (Twitter)'],
      showBadge: true,
      showSnakeGraph: true,
      showPacmanGraph: false,
      graphPlacement: 'bottom',
    },
  },
  {
    id: 'opensource',
    name: 'Open Source Maintainer',
    description: 'Community tools, CLI packages, and backend architecture',
    icon: '🚀',
    badge: 'Open Source',
    state: {
      name: 'an Open Source Maintainer & Architect',
      description:
        'Passionate about building open-source developer tools, CLI utilities, and distributed backend systems.',
      techs: [
        'TypeScript',
        'Go',
        'Rust',
        'Python',
        'Docker',
        'Kubernetes',
        'GraphQL',
        'Git',
        'Linux',
      ],
      socials: ['GitHub', 'X (Twitter)', 'Dev.to', 'Discord'],
      showBadge: true,
      showRepoSpotlight: true,
      showSnakeGraph: true,
      showPacmanGraph: false,
      graphPlacement: 'bottom',
    },
  },
  {
    id: 'datascientist',
    name: 'Data Scientist & AI Engineer',
    description: 'Machine learning, data pipelines, and AI models',
    icon: '🤖',
    badge: 'AI / ML',
    state: {
      name: 'a Data Scientist & AI/ML Engineer',
      description:
        'Transforming complex data into insights, training deep learning models, and building intelligent AI applications.',
      techs: [
        'Python',
        'PyTorch',
        'TensorFlow',
        'Pandas',
        'NumPy',
        'Jupyter',
        'Docker',
        'AWS',
      ],
      socials: ['GitHub', 'LinkedIn', 'Kaggle', 'Medium'],
      showBadge: true,
      showSnakeGraph: false,
      showPacmanGraph: true,
      graphPlacement: 'bottom',
    },
  },
  {
    id: 'frontend',
    name: 'Frontend Specialist & UI Engineer',
    description: 'Design systems, fluid animations, and pixel-perfect UIs',
    icon: '✨',
    badge: 'Design UI',
    state: {
      name: 'a Frontend Architect & UI Engineer',
      description:
        'Crafting pixel-perfect web interfaces, responsive design systems, and rich micro-interactions.',
      techs: [
        'JavaScript',
        'TypeScript',
        'React',
        'Vue.js',
        'Next.js',
        'Tailwind CSS',
        'Figma',
        'Framer Motion',
        'Sass',
      ],
      socials: ['GitHub', 'LinkedIn', 'X (Twitter)', 'CodePen', 'Dribbble'],
      showBadge: true,
      showSnakeGraph: true,
      showPacmanGraph: false,
      graphPlacement: 'bottom',
    },
  },
];
