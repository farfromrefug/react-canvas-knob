import * as React from 'react';
export interface IKnobProps extends React.DOMAttributes<{}> {
    value?: number;
    onChange?: (event: any) => void;
    onChangeEnd?: (event: any) => void;
    min?: number;
    max?: number;
    step?: number;
    log?: boolean;
    width?: number;
    height?: number;
    thickness?: number;
    lineCap?: 'butt' | 'round';
    bgColor?: string;
    fgColor?: string;
    inputColor?: string;
    font?: string;
    fontWeight?: string;
    clockwise?: boolean;
    cursor?: number | boolean | {
        value?: number;
        widthMultiplier?: number;
        color?: string;
    }[];
    connector?: {
        value?: number;
        width?: number;
        color?: string;
    };
    stopper?: boolean;
    readOnly?: boolean;
    disableTextInput?: boolean;
    displayInput?: boolean;
    displayCustom?: Function;
    angleArc?: number;
    angleOffset?: number;
    disableMouseWheel?: boolean;
    title?: string;
    className?: string;
    canvasClassName?: string;
}
export interface IKnobState {
    isFocused: boolean;
}
declare class Knob extends React.Component<IKnobProps, IKnobState> {
    static propTypes: {};
    static defaultProps: Partial<IKnobProps>;
    angleArc: number;
    angleOffset: number;
    startAngle: number;
    endAngle: number;
    connectStartAngle: number;
    connectEndAngle: number;
    digits: number;
    w: number;
    h: number;
    touchIndex: number;
    lineWidth: number;
    xy: number;
    radius: number;
    canvasRef: HTMLCanvasElement;
    constructor(props: any);
    componentDidMount(): void;
    componentWillReceiveProps(nextProps: any): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    getArcToValue: (v: any, type?: string, cursor?: any) => {
        startAngle: any;
        endAngle: any;
        acw: boolean;
    };
    getCanvasScale: (ctx: any) => number;
    coerceToStep: (v: any) => number;
    eventToValue: (e: any) => number;
    handleMouseDown: (e: any) => void;
    handleMouseMove: (e: any) => void;
    handleMouseUp: (e?: any) => void;
    handleTouchStart: (e: any) => void;
    handleTouchMove: (e: any) => void;
    handleTouchEnd: (e: any) => void;
    handleEsc: (e: any) => void;
    handleTextInput: (e: any) => void;
    handleWheel: (e: any) => void;
    handleArrowKey: (e: any) => void;
    inputStyle: () => React.CSSProperties;
    drawCanvas(): void;
    renderCenter: () => any;
    render(): JSX.Element;
}
export default Knob;
