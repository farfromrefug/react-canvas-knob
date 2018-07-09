import * as React from 'react';

export interface IKnobProps extends React.DOMAttributes<{}> {
    value: number;
    onChange: (event) => void;
    onChangeEnd: (event) => void;
    min: number;
    max: number;
    step: number;
    log: boolean;
    width: number;
    height: number;
    thickness: number;
    lineCap: 'butt' | 'round';
    bgColor: string;
    fgColor: string;
    inputColor: string;
    font: string;
    fontWeight: string;
    clockwise: boolean;
    cursor: number | boolean | { value?: number; widthMultiplier?: number; color?: string }[];
    connector: { value?: number; width?: number; color?: string };
    stopper: boolean;
    readOnly: boolean;
    disableTextInput: boolean;
    displayInput: boolean;
    displayCustom: Function;
    angleArc: number;
    angleOffset: number;
    disableMouseWheel: boolean;
    title: string;
    className: string;
    canvasClassName: string;
}
export interface IKnobState {
    isFocused: boolean;
}

class Knob extends React.Component<IKnobProps, IKnobState> {
    static propTypes = {};

    static defaultProps:Partial<IKnobProps> = {
        onChangeEnd: () => {},
        min: 0,
        max: 100,
        step: 1,
        log: false,
        width: 200,
        height: 200,
        thickness: 0.35,
        lineCap: 'butt',
        bgColor: '#EEE',
        fgColor: '#EA2',
        inputColor: '',
        font: 'Arial',
        fontWeight: 'bold',
        clockwise: true,
        cursor: false,
        connector: null,
        stopper: true,
        readOnly: false,
        disableTextInput: false,
        displayInput: true,
        angleArc: 360,
        angleOffset: 0,
        disableMouseWheel: false,
        className: null,
        canvasClassName: null
    };
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
    constructor(props) {
        super(props);
        this.w = this.props.width || 200;
        this.h = this.props.height || this.w;
        // this.cursorExt = this.props.cursor === true ? 0.3 : this.props.cursor / 100;
        this.angleArc = (this.props.angleArc * Math.PI) / 180;
        this.angleOffset = (this.props.angleOffset * Math.PI) / 180;
        this.startAngle = 1.5 * Math.PI + this.angleOffset;
        this.endAngle = 1.5 * Math.PI + this.angleOffset + this.angleArc;
        this.connectStartAngle = 1.5 * Math.PI + this.angleOffset;
        this.connectEndAngle = 1.5 * Math.PI + this.angleOffset + this.angleArc;
        this.digits = Math.max(String(Math.abs(this.props.min)).length, String(Math.abs(this.props.max)).length, 2) + 2;
    }

    componentDidMount() {
        this.drawCanvas();
        if (!this.props.readOnly) {
            this.canvasRef.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.width && this.w !== nextProps.width) {
            this.w = nextProps.width;
        }
        if (nextProps.height && this.h !== nextProps.height) {
            this.h = nextProps.height;
        }
    }

    componentDidUpdate() {
        this.drawCanvas();
    }

    componentWillUnmount() {
        this.canvasRef.removeEventListener('touchstart', this.handleTouchStart);
    }

    getArcToValue = (v, type = 'knob', cursor?) => {
        let startAngle, endAngle, cursorExt, connectStartAngle, connectEndAngle;
        const angle = !this.props.log
            ? ((v - this.props.min) * this.angleArc) / (this.props.max - this.props.min)
            : Math.log(Math.pow(v / this.props.min, this.angleArc)) / Math.log(this.props.max / this.props.min);
        if (!this.props.clockwise) {
            startAngle = this.endAngle + 0.00001;
            endAngle = startAngle - angle - 0.00001;
            connectStartAngle = this.connectEndAngle + 0.00001;
            connectEndAngle = connectStartAngle - angle - 0.00001;
        } else {
            startAngle = this.startAngle - 0.00001;
            endAngle = startAngle + angle + 0.00001;
            connectStartAngle = this.connectStartAngle - 0.00001;
            connectEndAngle = connectStartAngle + angle + 0.00001;
        }

        if (this.props.connector && Array.isArray(this.props.cursor) && this.props.cursor.length > 1 && type === 'connector') {
            var multiplier = this.props.angleArc / (this.props.max - this.props.min) - 1;
            var length = multiplier * (this.props.cursor[1].value - this.props.cursor[0].value);
            var connector = length / 100;
            startAngle = connectEndAngle - connector;
            endAngle += connector;
        } else if (this.props.cursor && type === 'cursor') {
            cursorExt = cursor.widthMultiplier / 100;
            startAngle = endAngle - cursorExt;
            endAngle += cursorExt;
        }

        return {
            startAngle,
            endAngle,
            acw: !this.props.clockwise && !this.props.cursor
        };
    };

    // Calculate ratio to scale canvas to avoid blurriness on HiDPI devices
    getCanvasScale = ctx => {
        const devicePixelRatio =
            window.devicePixelRatio ||
            window.screen.deviceXDPI / window.screen.logicalXDPI || // IE10
            1;
        const backingStoreRatio = ctx.webkitBackingStorePixelRatio || 1;
        return devicePixelRatio / backingStoreRatio;
    };

    coerceToStep = v => {
        let val = !this.props.log
            ? ~~((v < 0 ? -0.5 : 0.5) + v / this.props.step) * this.props.step
            : Math.pow(this.props.step, ~~((Math.abs(v) < 1 ? -0.5 : 0.5) + Math.log(v) / Math.log(this.props.step)));
        val = Math.max(Math.min(val, this.props.max), this.props.min);
        if (isNaN(val)) {
            val = 0;
        }
        return Math.round(val * 1000) / 1000;
    };

    eventToValue = e => {
        const bounds = this.canvasRef.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;
        let a = Math.atan2(x - this.w / 2, this.w / 2 - y) - this.angleOffset;
        if (!this.props.clockwise) {
            a = this.angleArc - a - 2 * Math.PI;
        }
        if (this.angleArc !== Math.PI * 2 && a < 0 && a > -0.5) {
            a = 0;
        } else if (a < 0) {
            a += Math.PI * 2;
        }
        const val = !this.props.log ? (a * (this.props.max - this.props.min)) / this.angleArc + this.props.min : Math.pow(this.props.max / this.props.min, a / this.angleArc) * this.props.min;
        return this.coerceToStep(val);
    };

    handleMouseDown = e => {
        this.props.onChange(this.eventToValue(e));
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('keyup', this.handleEsc);
    };

    handleMouseMove = e => {
        e.preventDefault();
        this.props.onChange(this.eventToValue(e));
    };

    handleMouseUp = (e?) => {
        this.props.onChangeEnd(this.eventToValue(e));
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('keyup', this.handleEsc);
    };

    handleTouchStart = e => {
        e.preventDefault();
        this.touchIndex = e.targetTouches.length - 1;
        this.props.onChange(this.eventToValue(e.targetTouches[this.touchIndex]));
        document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd);
        document.addEventListener('touchcancel', this.handleTouchEnd);
    };

    handleTouchMove = e => {
        e.preventDefault();
        this.props.onChange(this.eventToValue(e.targetTouches[this.touchIndex]));
    };

    handleTouchEnd = e => {
        this.props.onChangeEnd(this.eventToValue(e.changedTouches[this.touchIndex]));
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('touchcancel', this.handleTouchEnd);
    };

    handleEsc = e => {
        if (e.keyCode === 27) {
            e.preventDefault();
            this.handleMouseUp();
        }
    };

    handleTextInput = e => {
        const val = Math.max(Math.min(+e.target.value, this.props.max), this.props.min) || this.props.min;
        this.props.onChange(val);
    };

    handleWheel = e => {
        e.preventDefault();
        if (e.deltaX > 0 || e.deltaY > 0) {
            this.props.onChange(this.coerceToStep(!this.props.log ? this.props.value + this.props.step : this.props.value * this.props.step));
        } else if (e.deltaX < 0 || e.deltaY < 0) {
            this.props.onChange(this.coerceToStep(!this.props.log ? this.props.value - this.props.step : this.props.value / this.props.step));
        }
    };

    handleArrowKey = e => {
        if (e.keyCode === 37 || e.keyCode === 40) {
            e.preventDefault();
            this.props.onChange(this.coerceToStep(!this.props.log ? this.props.value - this.props.step : this.props.value / this.props.step));
        } else if (e.keyCode === 38 || e.keyCode === 39) {
            e.preventDefault();
            this.props.onChange(this.coerceToStep(!this.props.log ? this.props.value + this.props.step : this.props.value * this.props.step));
        }
    };

    inputStyle = () =>
        ({
            width: `${(this.w / 2 + 4) >> 0}px`,
            height: `${(this.w / 3) >> 0}px`,
            position: 'absolute',
            verticalAlign: 'middle',
            marginTop: `${(this.w / 3) >> 0}px`,
            marginLeft: `-${((this.w * 3) / 4 + 2) >> 0}px`,
            border: 0,
            background: 'none',
            font: `${this.props.fontWeight} ${(this.w / this.digits) >> 0}px ${this.props.font}`,
            textAlign: 'center',
            color: this.props.inputColor || this.props.fgColor,
            padding: '0px',
            WebkitAppearance: 'none'
        } as React.CSSProperties);

    drawCanvas() {
        const ctx = this.canvasRef.getContext('2d');
        const scale = this.getCanvasScale(ctx);
        this.canvasRef.width = this.w * scale; // clears the canvas
        this.canvasRef.height = this.h * scale;
        ctx.scale(scale, scale);
        this.xy = this.w / 2; // coordinates of canvas center
        this.lineWidth = this.xy * this.props.thickness;
        this.radius = this.xy - this.lineWidth / 2;
        ctx.lineWidth = this.lineWidth;
        ctx.lineCap = this.props.lineCap;
        // background arc
        ctx.beginPath();
        ctx.strokeStyle = this.props.bgColor;
        ctx.arc(this.xy, this.xy, this.radius, this.endAngle - 0.00001, this.startAngle + 0.00001, true);
        ctx.stroke();
        // connector
        if (this.props.connector && Array.isArray(this.props.cursor) && this.props.cursor.length > 1) {
            const average = (this.props.cursor[0].value + this.props.cursor[1].value) / 2;
            const c = this.getArcToValue(average, 'connector');
            ctx.beginPath();
            ctx.strokeStyle = this.props.connector.color;
            ctx.lineWidth = this.props.connector.width || this.lineWidth;
            ctx.arc(this.xy, this.xy, this.radius, c.startAngle, c.endAngle, c.acw);
            ctx.stroke();
        }
        // cursors
        if (this.props.cursor && Array.isArray(this.props.cursor) && this.props.cursor.length > 0) {
            for (let i = this.props.cursor.length - 1; i >= 0; i--) {
                const cursor = this.props.cursor[i];
                const value = cursor.value ? cursor.value : this.props.value;
                const b = this.getArcToValue(value, 'cursor', cursor);
                ctx.beginPath();
                ctx.strokeStyle = this.props.cursor[i].color || this.props.fgColor;
                ctx.lineWidth = this.props.cursor[i].widthMultiplier ? this.lineWidth * this.props.cursor[i].widthMultiplier : this.lineWidth;
                ctx.arc(this.xy, this.xy, this.radius, b.startAngle, b.endAngle, b.acw);
                ctx.stroke();
            }
        } else if (this.props.cursor) {
            // foreground arc
            const a = this.getArcToValue(this.props.value);
            ctx.beginPath();
            ctx.strokeStyle = this.props.fgColor;
            ctx.arc(this.xy, this.xy, this.radius, a.startAngle, a.endAngle, a.acw);
            ctx.stroke();
        }
    }

    renderCenter = () => {
        const { displayCustom, displayInput, disableTextInput, readOnly, value } = this.props;

        if (displayInput) {
            return <input style={this.inputStyle()} type="text" value={value} onChange={this.handleTextInput} onKeyDown={this.handleArrowKey} readOnly={readOnly || disableTextInput} />;
        } else if (displayCustom && typeof displayCustom === 'function') {
            return displayCustom();
        }
        return null;
    };

    render() {
        const { canvasClassName, className, disableMouseWheel, readOnly, title, value } = this.props;

        return (
            <div className={className} style={{ width: this.w, height: this.h, display: 'inline-block' }} onWheel={readOnly || disableMouseWheel ? null : this.handleWheel}>
                <canvas
                    ref={ref => {
                        this.canvasRef = ref;
                    }}
                    className={canvasClassName}
                    style={{ width: '100%', height: '100%' }}
                    onMouseDown={readOnly ? null : this.handleMouseDown}
                    title={title ? `${title}: ${value}` : value + ''}
                />
                {this.renderCenter()}
            </div>
        );
    }
}

export default Knob;
