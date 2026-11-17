import React, { useState } from 'react';
import {
  Plus,
  RotateCcw,
  ArrowUp,
  BatteryCharging,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Search,
} from 'lucide-react';

interface DroneInstance {
  varName: string;
  address: string;
  codename: string;
  battery: number;
  altitude: number;
}

interface LookupTarget {
  attr: string;
  label: string;
  matchedStage: number; // 0 = instance, 1 = ElectricCar, 2 = Car, 3 = AttributeError
  resultText: string;
}

const LOOKUP_TARGETS: LookupTarget[] = [
  {
    attr: 'battery_kwh',
    label: 'ev.battery_kwh',
    matchedStage: 0,
    resultText: '75（在實體自身的 __dict__ 找到，立即回傳）',
  },
  {
    attr: 'charge_mode',
    label: 'ev.charge_mode',
    matchedStage: 1,
    resultText: '"快充支援"（實體無此屬性，在所屬 ElectricCar 類別找到）',
  },
  {
    attr: 'wheels',
    label: 'ev.wheels',
    matchedStage: 2,
    resultText: '4（子類別也沒有，向上至父類別 Car 找到）',
  },
  {
    attr: 'wings',
    label: 'ev.wings',
    matchedStage: 3,
    resultText: "AttributeError: 'ElectricCar' object has no attribute 'wings'",
  },
];

export const ConceptExplorer: React.FC = () => {
  // Module 1: Blueprint vs Instances
  const [defaultBattery, setDefaultBattery] = useState<number>(80);
  const [ascendStep, setAscendStep] = useState<number>(20);
  const [codenamePrefix, setCodenamePrefix] = useState<string>('Sky');
  const [drones, setDrones] = useState<DroneInstance[]>([
    { varName: 'd1', address: '0x2010', codename: 'Sky-1', battery: 80, altitude: 0 },
    { varName: 'd2', address: '0x2020', codename: 'Sky-2', battery: 80, altitude: 15 },
  ]);
  const [lastFactoryCode, setLastFactoryCode] = useState<string>(
    'd2 = Drone("Sky-2", battery=80)'
  );

  const handleSpawnDrone = () => {
    if (drones.length >= 4) return;
    const nextNum = drones.length + 1;
    const addr = `0x${(0x2010 + drones.length * 0x10).toString(16).toUpperCase()}`;
    const varName = `d${nextNum}`;
    const codename = `${codenamePrefix || 'Unit'}-${nextNum}`;
    setDrones((prev) => [
      ...prev,
      { varName, address: addr, codename, battery: defaultBattery, altitude: 0 },
    ]);
    setLastFactoryCode(`${varName} = Drone("${codename}", battery=${defaultBattery})`);
  };

  const handleMutateDrone = (address: string, action: 'ascend' | 'drain' | 'charge') => {
    setDrones((prev) =>
      prev.map((d) => {
        if (d.address !== address) return d;
        if (action === 'ascend') {
          if (d.battery < 10) {
            setLastFactoryCode(`# ${d.varName} 電量過低，無法起飛`);
            return d;
          }
          setLastFactoryCode(`${d.varName}.ascend(${ascendStep})`);
          return {
            ...d,
            altitude: d.altitude + ascendStep,
            battery: Math.max(0, d.battery - 10),
          };
        }
        if (action === 'drain') {
          setLastFactoryCode(`${d.varName}.battery -= 15`);
          return { ...d, battery: Math.max(0, d.battery - 15) };
        }
        setLastFactoryCode(`${d.varName}.charge()`);
        return { ...d, battery: 100 };
      })
    );
  };

  const handleResetFactory = () => {
    setDrones([
      { varName: 'd1', address: '0x2010', codename: 'Sky-1', battery: defaultBattery, altitude: 0 },
    ]);
    setLastFactoryCode(`d1 = Drone("Sky-1", battery=${defaultBattery})`);
  };

  // Module 2: self binding visualizer
  const [heroHp, setHeroHp] = useState<number>(65);
  const [mageHp, setMageHp] = useState<number>(40);
  const [activeSelfTarget, setActiveSelfTarget] = useState<'hero' | 'mage'>('hero');

  const handleHeal = (target: 'hero' | 'mage') => {
    setActiveSelfTarget(target);
    if (target === 'hero') {
      setHeroHp((hp) => Math.min(100, hp + 20));
    } else {
      setMageHp((hp) => Math.min(100, hp + 20));
    }
  };

  // Module 3: Attribute Lookup Chain
  const [selectedLookup, setSelectedLookup] = useState<LookupTarget>(LOOKUP_TARGETS[2]);

  const lookupStages = [
    {
      title: '1. 實體屬性字典 (ev.__dict__)',
      items: ['brand = "Tesla"', 'battery_kwh = 75'],
    },
    {
      title: '2. 所屬類別 (class ElectricCar)',
      items: ['charge_mode = "快充支援"', 'def describe(self)'],
    },
    {
      title: '3. 父類別 (class Car)',
      items: ['wheels = 4', 'def drive(self)'],
    },
    {
      title: '4. 查找終點 (Exception)',
      items: ['若皆無符合名稱，拋出 AttributeError'],
    },
  ];

  return (
    <section aria-label="互動觀念圖解" className="space-y-12">
      {/* Module 1: Blueprint vs Instances */}
      <div className="space-y-5">
        <div className="border-b border-slate-200 pb-4">
          <div className="text-xs font-medium text-slate-500">
            互動圖解 01 · 類別與實體的獨立性
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            01. 一份藍圖，多個獨立物件實體
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            調整左側藍圖預設值並製造多個無人機實體。試著只操作其中一台無人機，觀察為什麼其他實體的記憶體狀態完全不受影響。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          {/* Left: Blueprint Controls */}
          <div className="lg:col-span-4 rounded-xl border border-blue-200 bg-white p-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-mono text-sm font-semibold text-blue-800">class Drone:</span>
                <span className="text-xs text-slate-500">類別藍圖設定</span>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prefix-input" className="block text-xs font-medium text-slate-700">
                  代號前綴 (codename prefix)
                </label>
                <input
                  id="prefix-input"
                  type="text"
                  maxLength={10}
                  value={codenamePrefix}
                  onChange={(e) => setCodenamePrefix(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="battery-slider" className="font-medium text-slate-700">
                    初始電量 (battery)
                  </label>
                  <span className="font-mono font-semibold text-blue-700 tabular-nums">
                    {defaultBattery}%
                  </span>
                </div>
                <input
                  id="battery-slider"
                  type="range"
                  min={20}
                  max={100}
                  step={5}
                  value={defaultBattery}
                  onChange={(e) => setDefaultBattery(Number(e.target.value))}
                  className="w-full accent-blue-700"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="ascend-slider" className="font-medium text-slate-700">
                    單次爬升高度 (ascend step)
                  </label>
                  <span className="font-mono font-semibold text-blue-700 tabular-nums">
                    {ascendStep} m
                  </span>
                </div>
                <input
                  id="ascend-slider"
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={ascendStep}
                  onChange={(e) => setAscendStep(Number(e.target.value))}
                  className="w-full accent-blue-700"
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSpawnDrone}
                  disabled={drones.length >= 4}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>製造新實體 ({drones.length}/4)</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFactory}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 shrink-0"
                  aria-label="重置實體工廠"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              <div className="rounded-lg bg-slate-950 px-3 py-2 font-mono text-xs text-emerald-300 truncate">
                &gt;&gt;&gt; {lastFactoryCode}
              </div>
            </div>
          </div>

          {/* Right: Live Heap Instances Stage */}
          <div className="lg:col-span-8 blueprint-grid rounded-xl border border-slate-200 p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold text-slate-900">記憶體中的獨立物件實體</span>
              <span className="font-mono tabular-nums">已配置 {drones.length} 塊記憶體</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 flex-1">
              {drones.map((drone) => (
                <div
                  key={drone.address}
                  className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="font-mono text-sm font-bold text-slate-900">
                        {drone.varName} <span className="font-normal text-slate-400">→</span>{' '}
                        <span className="text-amber-700">{drone.address}</span>
                      </div>
                      <span className="font-mono text-xs text-slate-500">Drone</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                      <div className="rounded bg-slate-50 p-2">
                        <div className="text-[11px] text-slate-500">.codename</div>
                        <div className="mt-0.5 font-semibold text-slate-900 truncate">
                          "{drone.codename}"
                        </div>
                      </div>
                      <div className="rounded bg-slate-50 p-2">
                        <div className="text-[11px] text-slate-500">.battery</div>
                        <div
                          className={`mt-0.5 font-semibold tabular-nums ${
                            drone.battery <= 20 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {drone.battery}%
                        </div>
                      </div>
                      <div className="rounded bg-slate-50 p-2">
                        <div className="text-[11px] text-slate-500">.altitude</div>
                        <div className="mt-0.5 font-semibold text-blue-700 tabular-nums">
                          {drone.altitude}m
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleMutateDrone(drone.address, 'ascend')}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      <ArrowUp className="h-3.5 w-3.5 text-blue-700" />
                      <span>起飛</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMutateDrone(drone.address, 'drain')}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      <Zap className="h-3.5 w-3.5 text-amber-600" />
                      <span>耗電</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMutateDrone(drone.address, 'charge')}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      <BatteryCharging className="h-3.5 w-3.5 text-emerald-600" />
                      <span>充滿</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Module 2: self Binding Visualizer */}
      <div className="space-y-5">
        <div className="border-b border-slate-200 pb-4">
          <div className="text-xs font-medium text-slate-500">
            互動圖解 02 · self 的真正含義
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            02. 呼叫方法時，self 到底指向誰？
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            兩個物件共用類別裡的同一個 <code className="font-mono text-blue-700">heal()</code> 方法程式碼。點擊任一物件的呼叫按鈕，觀察 Python 如何自動把接收者傳入第一個參數 <code className="font-mono text-amber-700">self</code>。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center rounded-xl border border-slate-200 bg-white p-6">
          {/* Shared Method Blueprint */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-semibold text-slate-500">類別內共用的方法定義</div>
            <div className="rounded-lg bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
              <div className="text-blue-300">class Character:</div>
              <div className="pl-4 text-slate-300">
                def heal(<span className="rounded bg-amber-500/25 px-1 text-amber-300 font-semibold">self</span>, amount):
              </div>
              <div className="pl-8 text-slate-300">
                <span className="rounded bg-amber-500/25 px-1 text-amber-300 font-semibold">self</span>.hp += amount
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5">
              <div className="font-medium text-slate-700">Python 底層等效轉換：</div>
              <div className="font-mono text-sm font-semibold text-blue-800">
                Character.heal(self={activeSelfTarget}, amount=20)
              </div>
              <div className="text-slate-600">
                目前 <code className="font-mono text-amber-700 font-semibold">self</code> 綁定記憶體位址：
                <span className="font-mono font-semibold text-amber-700 ml-1">
                  {activeSelfTarget === 'hero' ? '0x4010 (hero)' : '0x4020 (mage)'}
                </span>
              </div>
            </div>
          </div>

          {/* Directional Binding Indicator */}
          <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center gap-2 text-center">
            <div className="font-mono text-xs font-semibold text-amber-700">
              self = {activeSelfTarget === 'hero' ? '0x4010' : '0x4020'}
            </div>
            <div className="flex items-center text-amber-600">
              <div className="h-px w-14 bg-amber-500" />
              <ArrowRight className="h-4 w-4 -ml-1" />
            </div>
            <div className="text-xs text-slate-500">精準修改目標實體</div>
          </div>

          {/* Two Live Objects */}
          <div className="lg:col-span-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Hero */}
            <div
              className={`rounded-lg border p-4 space-y-3 transition-colors ${
                activeSelfTarget === 'hero'
                  ? 'border-amber-500 bg-amber-50/30'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-slate-900">hero</span>
                <span className="text-amber-700">0x4010</span>
              </div>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">.name</span>
                  <span className="text-slate-900">"騎士"</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">.hp</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">{heroHp} / 100</span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-emerald-600 transition-transform duration-200 origin-left"
                  style={{ transform: `scaleX(${heroHp / 100})` }}
                />
              </div>
              <button
                type="button"
                onClick={() => handleHeal('hero')}
                className="w-full rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
              >
                hero.heal(20)
              </button>
            </div>

            {/* Mage */}
            <div
              className={`rounded-lg border p-4 space-y-3 transition-colors ${
                activeSelfTarget === 'mage'
                  ? 'border-amber-500 bg-amber-50/30'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-slate-900">mage</span>
                <span className="text-amber-700">0x4020</span>
              </div>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">.name</span>
                  <span className="text-slate-900">"法師"</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">.hp</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">{mageHp} / 100</span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-emerald-600 transition-transform duration-200 origin-left"
                  style={{ transform: `scaleX(${mageHp / 100})` }}
                />
              </div>
              <button
                type="button"
                onClick={() => handleHeal('mage')}
                className="w-full rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
              >
                mage.heal(20)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Module 3: Attribute Lookup Chain (MRO) */}
      <div className="space-y-5">
        <div className="border-b border-slate-200 pb-4">
          <div className="text-xs font-medium text-slate-500">
            互動圖解 03 · 繼承與屬性查找路徑 (MRO)
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            03. 當存取 ev.屬性 時，Python 如何沿著繼承鏈尋找？
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            選擇不同的屬性讀取運算式，追蹤 Python 從「實體自身」一路往上查找至「父類別」的順序。
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100 p-1">
              {LOOKUP_TARGETS.map((target) => {
                const active = selectedLookup.attr === target.attr;
                return (
                  <button
                    key={target.attr}
                    type="button"
                    onClick={() => setSelectedLookup(target)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Search className="h-3 w-3 text-blue-700" />
                    <span>{target.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-mono text-slate-700">
              結果：<span className="font-semibold text-blue-800">{selectedLookup.resultText}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {lookupStages.map((stage, idx) => {
              const isMatch = selectedLookup.matchedStage === idx;
              const isSearchedPast = idx < selectedLookup.matchedStage;
              const isUnreached = idx > selectedLookup.matchedStage;
              const isErrorStage = idx === 3 && isMatch;

              return (
                <div
                  key={stage.title}
                  className={`rounded-lg border p-4 space-y-3 transition-colors ${
                    isErrorStage
                      ? 'border-rose-300 bg-rose-50/70'
                      : isMatch
                        ? 'border-emerald-400 bg-emerald-50/60'
                        : isSearchedPast
                          ? 'border-slate-300 bg-slate-50'
                          : 'border-slate-200 bg-white opacity-55'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900">{stage.title}</span>
                  </div>

                  <div className="space-y-1 font-mono text-xs">
                    {stage.items.map((item) => (
                      <div key={item} className="rounded bg-white/80 px-2 py-1 text-slate-700 border border-slate-200/70">
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium pt-1">
                    {isErrorStage ? (
                      <>
                        <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span className="text-rose-700">查找失敗：拋出錯誤</span>
                      </>
                    ) : isMatch ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-emerald-700">命中目標，停止查找</span>
                      </>
                    ) : isSearchedPast ? (
                      <span className="text-slate-500">無符合屬性，繼續往上</span>
                    ) : isUnreached ? (
                      <span className="text-slate-400">未觸及此層</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
