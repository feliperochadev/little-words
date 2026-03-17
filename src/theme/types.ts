export interface ColorTokens {
  // Brand
  primary:       string;
  primaryLight:  string;
  primaryDark:   string;
  secondary:     string;
  accent:        string;
  // Profile
  profileGirl:   string;
  profileGirlBg: string;
  profileBoy:    string;
  profileBoyBg:  string;
  // Semantic
  success:       string;
  error:         string;
  warning:       string;
  info:          string;
  // Surface
  background:    string;
  surface:       string;
  surfaceHover:  string;
  border:        string;
  borderFocus:   string;
  backdrop:      string;
  // Text
  text:          string;
  textSecondary: string;
  textMuted:     string;
  textOnPrimary: string;
  textOnError:   string;
}

export interface TypographyTokens {
  fontSize: {
    xs:    number;
    sm:    number;
    md:    number;
    lg:    number;
    xl:    number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
  };
  fontWeight: {
    regular:  '400';
    medium:   '500';
    semibold: '600';
    bold:     '700';
    heavy:    '800';
    black:    '900';
  };
  lineHeight: {
    tight:   number;
    normal:  number;
    relaxed: number;
  };
  letterSpacing: {
    tight:  number;
    normal: number;
    wide:   number;
    wider:  number;
  };
}

export interface SpacingTokens {
  '0':   number;
  '1':   number;
  '2':   number;
  '3':   number;
  '4':   number;
  '5':   number;
  '6':   number;
  '7':   number;
  '8':   number;
  '10':  number;
}

export interface ShapeTokens {
  xs:    number;
  sm:    number;
  md:    number;
  lg:    number;
  xl:    number;
  '2xl': number;
  full:  number;
}

export interface ShadowLevel {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ElevationTokens {
  none: ShadowLevel;
  sm:   ShadowLevel;
  md:   ShadowLevel;
  lg:   ShadowLevel;
}

export interface MotionTokens {
  duration: {
    instant: number;
    fast:    number;
    normal:  number;
    slow:    number;
  };
  easing: {
    easeOut:   string;
    easeIn:    string;
    easeInOut: string;
  };
}

export interface Theme {
  colors:     ColorTokens;
  typography: TypographyTokens;
  spacing:    SpacingTokens;
  shape:      ShapeTokens;
  elevation:  ElevationTokens;
  motion:     MotionTokens;
}
