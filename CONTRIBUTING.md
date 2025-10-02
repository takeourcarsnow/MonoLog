# Contributing to MonoLog

Thank you for your interest in contributing to MonoLog! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/MonoLog.git`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env.local` and configure as needed
5. Run the development server: `npm run dev`

## Development Workflow

1. Create a new branch for your feature: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test your changes locally
4. Run linting: `npm run lint`
5. Run type checking: `npx tsc --noEmit`
6. Commit your changes with a clear message
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Code Style

- Use TypeScript strict mode
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

## Testing

Before submitting a PR:
- Build succeeds: `npm run build`
- No lint errors: `npm run lint`
- No TypeScript errors: `npx tsc --noEmit`
- Test both local and Supabase modes if applicable

## Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include screenshots for UI changes
- Keep PRs focused on a single feature or fix
- Update documentation if needed

## Reporting Issues

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment information
- Screenshots if applicable

## Questions?

Open an issue with the "question" label if you need help or clarification.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
