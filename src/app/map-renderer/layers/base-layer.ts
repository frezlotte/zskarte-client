import { Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { ZsMapDrawElementStateType, ZsMapLayerState } from '../../state/interfaces';
import { ZsMapStateService } from '../../state/state.service';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature, { FeatureLike } from 'ol/Feature';
import { DrawStyle } from '../draw-style';

export abstract class ZsMapBaseLayer {
  protected _layer: Observable<ZsMapLayerState | undefined>;
  protected _olSource = new VectorSource();
  protected _unsubscribe = new Subject<void>();

  protected _olLayer: VectorLayer<VectorSource> = new VectorLayer({
    source: this._olSource,
    style: (feature: FeatureLike, resolution: number) => {
      if (feature.get('hidden') === true) {
        return undefined;
      }
      return DrawStyle.styleFunction(feature, resolution);
    },
  });

  constructor(
    protected _id: string,
    protected _state: ZsMapStateService,
  ) {
    this._layer = this._state.observeMapState().pipe(
      map((o) => {
        if (o?.layers && o.layers.length > 0) {
          return o.layers.find((i) => i.id === this._id);
        }
        return undefined;
      }),
      distinctUntilChanged((x, y) => x === y),
      takeUntil(this._unsubscribe),
    );

    this.observePosition()
      .pipe(takeUntil(this._unsubscribe))
      .subscribe((position) => {
        this._olLayer.setZIndex(position ? position * 100 : 100);
      });

    this.observeIsVisible()
      .pipe(takeUntil(this._unsubscribe))
      .subscribe((isVisible) => {
        this._olLayer.setVisible(isVisible);
      });

    this.observeOpacity()
      .pipe(takeUntil(this._unsubscribe))
      .subscribe((opacity) => {
        this._olLayer.setOpacity(opacity);
      });
  }

  public getId(): string {
    return this._id;
  }

  public getOlLayer(): VectorLayer<VectorSource> {
    return this._olLayer;
  }

  public addOlFeature(feature: Feature): void {
    this._olSource.addFeature(feature);
  }

  public removeOlFeature(feature: Feature): void {
    this._olSource.removeFeature(feature);
  }

  // public getOlSource(): VectorSource;

  public observeOpacity(): Observable<number> {
    return this._state.observeDisplayState().pipe(
      map((o) => {
        return o?.layerOpacity?.[this._id] === undefined ? 1 : o?.layerOpacity?.[this._id];
      }),
      distinctUntilChanged((x, y) => x === y),
      takeUntil(this._unsubscribe),
    );
  }

  public observeName(): Observable<string | undefined> {
    return this._layer.pipe(
      map((o) => {
        return o?.name;
      }),
      distinctUntilChanged((x, y) => x === y),
      takeUntil(this._unsubscribe),
    );
  }

  public observeIsVisible(): Observable<boolean> {
    return this._state.observeDisplayState().pipe(
      map((o) => {
        return o?.layerVisibility?.[this._id];
      }),
      distinctUntilChanged((x, y) => x === y),
      takeUntil(this._unsubscribe),
    );
  }

  public observePosition(): Observable<number> {
    return this._state.observeDisplayState().pipe(
      map((o) => {
        return o?.layerOrder.findIndex((o) => o === this._id) + 1;
      }),
      distinctUntilChanged((x, y) => x === y),
      takeUntil(this._unsubscribe),
    );
  }

  public abstract draw(type: ZsMapDrawElementStateType, options?: { symbolId?: number; text?: string }): void;

  public unsubscribe(): void {
    this._unsubscribe.next();
    this._unsubscribe.complete();
  }
}
