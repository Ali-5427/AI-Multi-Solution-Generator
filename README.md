# 🚀 AI Multi-Solution Generator

🤖 An intelligent web application that leverages multiple AI models to generate diverse solution approaches for hackathon problems. Built with Next.js, TypeScript, and Tailwind CSS.

## ✨ Features

- **🔄 Multi-Model AI Integration**: Utilizes various AI models including Claude, GPT-4, Gemini, and Llama through OpenRouter API
- **🎯 Diverse Solution Generation**: Generates 5 different solution approaches for any given problem statement
- **📊 Detailed Analysis**: Each solution includes:
  - Creative approach name
  - Comprehensive description
  - Key advantages
  - Implementation complexity (Low/Medium/High)
  - Time estimates
  - Required technologies
- **🎨 Interactive UI**: Expandable solution cards with clean, modern design
- **⚡ Real-time Processing**: Fallback mechanism tries multiple models if one fails

## 💻 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI API**: OpenRouter (supports multiple AI providers)

## 🚀 Getting Started

### 📋 Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/Ali-5427/AI-Multi-Solution-Generator.git
cd ai-multi-solution-generator
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Usage

1. ✏️ Enter your hackathon problem statement in the text area
2. ⚡ Click "Generate 5 Solutions" to get multiple solution approaches
3. 🔍 Expand each solution card to view detailed advantages and technologies
4. 🏆 Use the information to plan your hackathon project

## 🔑 API Configuration

The app uses OpenRouter API for AI model access. The API key is configured in the code for demonstration purposes. For production use, consider:

- Moving API keys to environment variables
- Implementing proper authentication
- Adding rate limiting and error handling

## 🏗️ Build & Deploy

### 🔨 Build for Production

```bash
npm run build
```

### ▶️ Start Production Server

```bash
npm start
```

### 🚀 Deploy on Vercel

The easiest way to deploy is using Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📜 License

This project is private and proprietary.

## 🙏 Acknowledgments

- OpenRouter for providing unified AI model access
- Next.js team for the excellent framework
- Tailwind CSS for utility-first styling
