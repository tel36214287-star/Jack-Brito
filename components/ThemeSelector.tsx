import React, { useState, useRef, useEffect } from 'react';

interface ThemeDetail {
  id: string;
  name: string;
  description: string;
  visualElements: string;
  applications: string;
}

const themes: ThemeDetail[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Um mergulho em um futuro distópico onde a tecnologia e a cultura digital se encontram. O Cyberpunk traz uma sensação de submundo futurista, repleto de caos e inovação.',
    visualElements: 'Tons neon vibrantes como ciano elétrico, rosa profundo e roxo destacam-se contra um fundo azul-preto. Luzes de néon intensas, hologramas e grades metálicas criam uma atmosfera digital imersiva e vibrante.',
    applications: 'Ideal para interfaces futurísticas, conceitos de realidade aumentada, jogos de ficção científica e realidade virtual, proporcionando uma sensação de estar no meio de um universo digital em constante evolução.',
  },
  {
    id: 'hq',
    name: 'HQ (Quadrinhos)',
    description: 'Um tributo aos clássicos das histórias em quadrinhos, com bordas grossas e contornos nítidos, trazendo um contraste dramático e uma estética visual vibrante.',
    visualElements: 'A base em preto e off-white é pontuada por toques de vermelho vibrante e azul clássico. Texturas de tinta, sombras dramáticas e balões de fala no estilo dos quadrinhos criam um visual dinâmico e impactante.',
    applications: 'Perfeito para temas de entretenimento, jogos de super-heróis, sites de comics ou animações, trazendo à tona a energia e o impacto visual dos quadrinhos.',
  },
  {
    id: 'halloween',
    name: 'Halloween',
    description: 'Um tema sombrio e misterioso, perfeito para capturar a essência do Halloween. Com uma vibração assustadora, é envolvente e divertido, trazendo a atmosfera de uma noite de sustos.',
    visualElements: 'Roxos profundos e laranjas flamejantes dominam a paleta, com abóboras, fantasmas e teias de aranha. Iluminação baixa e efeitos de neblina criam um ar enigmático e festivo, mas sem desfoques.',
    applications: 'Ideal para sites de festas, promoções de Halloween, lojas de decoração temática ou eventos de Halloween, onde o objetivo é criar um ambiente assustador e envolvente.',
  },
  {
    id: 'natal',
    name: 'Natal',
    description: 'Mágico, festivo e acolhedor, o tema de Natal traz à tona toda a alegria e o espírito de celebração dessa época especial.',
    visualElements: 'Verde floresta, vermelho festivo e dourado dominam a paleta. Árvores de Natal iluminadas, neve caindo, luzes cintilantes e presentes são evocados, com brilhos suaves que dão a sensação de um abraço caloroso.',
    applications: 'Perfeito para e-commerces de Natal, sites de promoção de fim de ano, lojas online de presentes, ou interfaces que busquem evocar a alegria e festividade do Natal.',
  },
  {
    id: 'floral',
    name: 'Floral',
    description: 'Leve, delicado e natural, o tema Floral celebra a beleza das flores e da natureza, com uma paleta suave e acolhedora.',
    visualElements: 'Tons pastéis de rosa, roxo suave e creme, acompanhados de padrões florais, folhagens delicadas e texturas orgânicas. O design é fluido, com bordas arredondadas e uma sensação de suavidade e frescor.',
    applications: 'Ideal para temas de primavera, bem-estar, saúde, ou qualquer interface que precise de uma energia calma, delicada e natural.',
  },
  {
    id: 'matrix',
    name: 'Matrix',
    description: 'Inspirado no filme Matrix, este tema traz uma estética digital e futurista, com um visual de realidade simulada e códigos caindo como uma chuva verde.',
    visualElements: 'Preto absoluto e verde neon elétrico são as cores dominantes, com um padrão sutil de códigos digitais no fundo. Efeitos de glitch e gráficos digitais dão a sensação de estar imerso em uma realidade virtual.',
    applications: 'Ideal para interfaces tecnológicas, sites de ciência da computação, jogos de ação ou qualquer projeto digital que envolva inteligência artificial, universos virtuais ou simulações digitais.',
  },
  {
    id: 'valentine',
    name: 'Valentine\'s Day',
    description: 'Romântico, suave e delicado, o tema de Dia dos Namorados evoca emoções de carinho, amor e romance.',
    visualElements: 'A paleta é composta por tons de rosa choque vibrante, vermelho profundo e branco cremoso, com detalhes que simbolizam o amor. O design é suave, com bordas arredondadas e texturas delicadas que transmitem um toque de ternura.',
    applications: 'Ideal para sites de namoro, promoções de Dia dos Namorados, presentes românticos, ou qualquer interface focada em relacionamentos, presentes especiais ou celebrações do amor.',
  },
];

interface ThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

const PaletteIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModalOpen]);
  
  const selectTheme = (themeId: string) => {
    onThemeChange(themeId);
    setIsModalOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsModalOpen(true)}
        className="p-2 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        aria-label="Selecionar tema"
        title="Selecionar Tema"
      >
        <PaletteIcon />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div ref={modalRef} className="bg-[var(--color-bg-primary)] border-2 border-[var(--color-border)] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b-2 border-[var(--color-border)]">
              <h2 className="text-xl font-bold text-[var(--color-accent)] font-[var(--font-primary)]">Escolha seu Tema</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
                aria-label="Fechar diálogo de tema"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
              {themes.map(theme => (
                <div 
                  key={theme.id} 
                  className={`border border-[var(--color-border)] rounded-lg p-4 flex flex-col justify-between transition-all duration-300 ${
                    currentTheme === theme.id 
                      ? 'shadow-[0_0_15px_var(--color-accent)] bg-[var(--color-bg-secondary)]' 
                      : 'hover:shadow-[0_0_10px_var(--color-border)] hover:bg-[var(--color-bg-secondary)]'
                  }`}
                >
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-accent)] mb-2 font-[var(--font-primary)]">{theme.name}</h3>
                    <p className="text-sm text-[var(--color-text-primary)] mb-2">{theme.description}</p>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      <p className="font-semibold mt-2">Elementos Visuais:</p>
                      <p>{theme.visualElements}</p>
                      <p className="font-semibold mt-2">Aplicações:</p>
                      <p>{theme.applications}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => selectTheme(theme.id)}
                    className={`mt-4 w-full py-2 rounded-md font-semibold transition-colors 
                      ${currentTheme === theme.id 
                        ? 'bg-[var(--color-accent)] text-white cursor-default' 
                        : 'bg-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-accent-hover)] hover:text-white'
                      }`}
                    disabled={currentTheme === theme.id}
                  >
                    {currentTheme === theme.id ? 'Tema Atual' : 'Selecionar Tema'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;