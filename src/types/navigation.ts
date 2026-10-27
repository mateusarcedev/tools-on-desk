import { IconName } from '../components/common/icons';

export type ScreenId =
  | 'home'
  | 'downloads'
  | 'documents'
  | 'audio'
  | 'video'
  | 'images'
  | 'posters'
  | 'history'
  | 'settings';

export interface NavItem {
  id: ScreenId;
  label: string;
  key: string;
  eyebrow: string;
  title: string;
  desc: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Início',
    key: '1',
    eyebrow: 'arce tools',
    title: 'O que vamos fazer hoje?',
    desc: 'Solte arquivos, cole um link ou escolha uma ferramenta.',
    icon: 'home',
  },
  {
    id: 'downloads',
    label: 'Downloads',
    key: '2',
    eyebrow: '02 · downloads',
    title: 'Downloads',
    desc: 'Baixe vídeos e áudios de links permitidos, um por vez, em lote ou playlists inteiras.',
    icon: 'downloads',
  },
  {
    id: 'documents',
    label: 'Documentos',
    key: '3',
    eyebrow: '03 · documentos',
    title: 'Documentos',
    desc: 'Converta, una, divida e comprima PDFs e documentos do Word.',
    icon: 'documents',
  },
  {
    id: 'audio',
    label: 'Áudio',
    key: '4',
    eyebrow: '04 · áudio',
    title: 'Áudio',
    desc: 'Converta, corte e ajuste arquivos de áudio, um ou vários de uma vez.',
    icon: 'audio',
  },
  {
    id: 'video',
    label: 'Vídeo',
    key: '5',
    eyebrow: '05 · vídeo',
    title: 'Vídeo',
    desc: 'Converta, comprima, corte e extraia áudio ou frames de vídeos.',
    icon: 'video',
  },
  {
    id: 'images',
    label: 'Imagens',
    key: '6',
    eyebrow: '06 · imagens',
    title: 'Imagens',
    desc: 'Converta, redimensione e comprima imagens em lote, ou junte tudo em um PDF.',
    icon: 'images',
  },
  {
    id: 'posters',
    label: 'Pôsteres',
    key: '7',
    eyebrow: '07 · pôsteres',
    title: 'Poster Studio',
    desc: 'Transforme uma imagem em um pôster grande, impresso em várias folhas.',
    icon: 'posters',
  },
  {
    id: 'history',
    label: 'Histórico',
    key: '8',
    eyebrow: 'histórico',
    title: 'Histórico',
    desc: 'Arquivos gerados e operações anteriores.',
    icon: 'history',
  },
  {
    id: 'settings',
    label: 'Configurações',
    key: '9',
    eyebrow: 'configurações',
    title: 'Configurações',
    desc: 'Aparência, pastas, desempenho e componentes de conversão.',
    icon: 'settings',
  },
];
