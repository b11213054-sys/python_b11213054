export interface SandboxLesson {
  id: string;
  order: string;
  title: string;
  subtitle: string;
  duration: string;
  level: string;
  conceptNote: string;
  keyTakeaways: Array<{ label: string; detail: string }>;
  starterCode: string;
}

export interface CodingChallenge {
  id: string;
  order: string;
  title: string;
  difficulty: '入門' | '進階' | '實戰';
  prompt: string;
  requirements: string[];
  hint: string;
  starterCode: string;
  solutionCode: string;
  testScript: string;
  testDescriptions: string[];
}

export interface QuizQuestion {
  id: string;
  topic: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const SANDBOX_LESSONS: SandboxLesson[] = [
  {
    id: 'blueprint-init',
    order: '01',
    title: '類別藍圖與 __init__ 建構子',
    subtitle: '理解 class 如何作為設計藍圖，並透過 __init__ 與 self 建立獨立的物件實體',
    duration: '4 分鐘',
    level: '基礎核心',
    conceptNote:
      '類別 (Class) 本身不會儲存個別資料，它像建築藍圖；每次呼叫 Dog(...) 時，Python 會在記憶體配置一塊獨立空間，並把該空間的位址傳給 __init__ 的第一個參數 self。',
    keyTakeaways: [
      { label: 'class 關鍵字', detail: '定義物件擁有哪些屬性與方法，習慣使用大駝峰命名 (如 Dog)。' },
      { label: '__init__ 方法', detail: '每次建立新實體時自動執行，負責為新物件綁定初始屬性。' },
      { label: 'self 參數', detail: '永遠指向「正在被建立或呼叫的那個物件實體」本身。' },
    ],
    starterCode: `class Dog:
    def __init__(self, name, age):
        self.name = name
        self.age = age
        self.energy = 100

dog1 = Dog("小黑", 3)
dog2 = Dog("豆花", 5)

print(f"{dog1.name} 的能量：{dog1.energy}")
print(f"{dog2.name} 今年 {dog2.age} 歲")`,
  },
  {
    id: 'class-vs-instance',
    order: '02',
    title: '類別屬性 vs 實體屬性',
    subtitle: '區分所有物件共用的資料，以及每個物件各自獨立擁有的狀態',
    duration: '5 分鐘',
    level: '觀念辨析',
    conceptNote:
      '直接寫在 class 底下、方法之外的變數是「類別屬性」，全體實體共用同一份；寫在 self.xxx 上的是「實體屬性」，每個物件各自保存。',
    keyTakeaways: [
      { label: '共用計數', detail: '可在 __init__ 中透過 ClassName.count += 1 統計目前共建立了幾個物件。' },
      { label: '屬性遮蔽', detail: '若透過 self.attr = ... 賦值，會在該實體新增獨立屬性，不再讀取類別預設值。' },
    ],
    starterCode: `class Robot:
    manufacturer = "PyLab 製造"
    total_units = 0

    def __init__(self, codename):
        self.codename = codename
        self.battery = 100
        Robot.total_units += 1

r1 = Robot("Alpha-01")
r2 = Robot("Beta-02")

r1.battery = 65
print(f"已生產數量：{Robot.total_units}")
print(f"{r1.codename} 製造商：{r1.manufacturer}，電量 {r1.battery}%")
print(f"{r2.codename} 電量維持：{r2.battery}%")`,
  },
  {
    id: 'methods-state',
    order: '03',
    title: '物件方法與狀態改變',
    subtitle: '讓物件不只是資料容器，更能透過方法封裝行為並安全地更新自身狀態',
    duration: '5 分鐘',
    level: '行為設計',
    conceptNote:
      '方法 (Method) 是定義在類別內部的函式。呼叫 account.deposit(500) 時，Python 會自動把 account 作為 self 傳入方法內，讓你讀取與修改 self.balance。',
    keyTakeaways: [
      { label: '狀態封裝', detail: '透過方法修改屬性，可以在內部加入條件檢查（例如餘額不足時拒絕提款）。' },
      { label: '連鎖行為', detail: '每次呼叫方法只會影響該接收者 (receiver) 指向的記憶體實體。' },
    ],
    starterCode: `class BankAccount:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        if amount > 0:
            self.balance += amount
            print(f"{self.owner} 存入 {amount} 元，餘額：{self.balance}")

    def withdraw(self, amount):
        if amount > self.balance:
            print(f"{self.owner} 餘額不足，無法提領 {amount} 元")
            return False
        self.balance -= amount
        print(f"{self.owner} 提領 {amount} 元，餘額：{self.balance}")
        return True

acc = BankAccount("林小美", 1000)
acc.deposit(500)
acc.withdraw(300)
acc.withdraw(2000)`,
  },
  {
    id: 'inheritance-super',
    order: '04',
    title: '繼承與 super() 擴充',
    subtitle: '從既有父類別延伸出專屬子類別，重用程式並覆寫特定方法',
    duration: '6 分鐘',
    level: '進階架構',
    conceptNote:
      '當 ElectricCar 繼承 Car 時，它自動擁有 Car 的屬性與方法。使用 super().__init__(...) 可以先交給父類別完成共通初始化，再補充子類別特有的屬性。',
    keyTakeaways: [
      { label: 'class 子類(父類)', detail: '建立「是一種 (is-a)」關係，子類別實體也是父類別的 isinstance。' },
      { label: 'super() 呼叫', detail: '避免重複撰寫父類別的初始化或運算邏輯，直接呼叫父類別版本。' },
      { label: '方法覆寫 (Override)', detail: '子類別定義同名方法時，會優先執行子類別的版本。' },
    ],
    starterCode: `class Vehicle:
    def __init__(self, brand, speed):
        self.brand = brand
        self.speed = speed

    def describe(self):
        return f"{self.brand} 目前時速 {self.speed} km/h"

class ElectricCar(Vehicle):
    def __init__(self, brand, speed, battery_kwh):
        super().__init__(brand, speed)
        self.battery_kwh = battery_kwh

    def describe(self):
        base = super().describe()
        return f"{base}（電池容量 {self.battery_kwh} kWh）"

car = Vehicle("Toyota", 80)
ev = ElectricCar("Model 3", 110, 75)

print(car.describe())
print(ev.describe())
print(f"ev 是 Vehicle 嗎？{isinstance(ev, Vehicle)}")`,
  },
  {
    id: 'encapsulation-property',
    order: '05',
    title: '封裝慣例與 @property',
    subtitle: '保護內部屬性不被外部任意破壞，並提供如同讀取屬性般的計算介面',
    duration: '5 分鐘',
    level: '工程實務',
    conceptNote:
      'Python 使用單底線 _attr 表示「內部屬性請勿直接修改」，搭配 @property 裝飾器，能讓呼叫端用讀取屬性的語法取得經過計算或驗證的值。',
    keyTakeaways: [
      { label: '_內部屬性慣例', detail: '提醒團隊成員應透過公開方法存取，而非直接覆寫內部資料。' },
      { label: '@property 唯讀視圖', detail: '呼叫 rect.area 時不需加括號，背後自動執行方法計算最新結果。' },
    ],
    starterCode: `class Rectangle:
    def __init__(self, width, height):
        self._width = width
        self._height = height

    @property
    def area(self):
        return self._width * self._height

    def resize(self, factor):
        if factor > 0:
            self._width *= factor
            self._height *= factor

box = Rectangle(4, 5)
print(f"初始面積：{box.area}")
box.resize(2)
print(f"放大兩倍後面積：{box.area}")`,
  },
];

export const CODING_CHALLENGES: CodingChallenge[] = [
  {
    id: 'challenge-student',
    order: '挑戰 01',
    title: '建立 Student 成績物件',
    difficulty: '入門',
    prompt: '定義一個 Student 類別，記錄學生姓名與分數，並提供判斷是否及格的方法。',
    requirements: [
      '定義 __init__(self, name, score)，綁定 self.name 與 self.score',
      '定義 is_passed(self) 方法：分數 >= 60 回傳 True，否則回傳 False',
      '定義 summary(self) 方法：回傳 f"{self.name}: {self.score}分"',
    ],
    hint: '在 __init__ 裡使用 self.name = name 與 self.score = score，並在 is_passed 中 return self.score >= 60。',
    starterCode: `class Student:
    def __init__(self, name, score):
        # 請完成屬性初始化
        pass

    def is_passed(self):
        # 回傳是否及格 (>= 60)
        return False

    def summary(self):
        return f"{self.name}: 0分"`,
    solutionCode: `class Student:
    def __init__(self, name, score):
        self.name = name
        self.score = score

    def is_passed(self):
        return self.score >= 60

    def summary(self):
        return f"{self.name}: {self.score}分"`,
    testScript: `
__s1 = Student("陳小明", 78)
__s2 = Student("王大華", 52)
print("TEST1:", __s1.name, __s1.score, __s1.is_passed())
print("TEST2:", __s2.is_passed())
print("TEST3:", __s1.summary())
`,
    testDescriptions: [
      'Student("陳小明", 78) 的屬性與 is_passed() 應為 True',
      'Student("王大華", 52).is_passed() 應回傳 False',
      'summary() 應回傳 "陳小明: 78分"',
    ],
  },
  {
    id: 'challenge-wallet',
    order: '挑戰 02',
    title: '防呆儲值錢包 Wallet',
    difficulty: '入門',
    prompt: '設計一個電子錢包類別，確保扣款時不會讓餘額變成負數。',
    requirements: [
      '__init__(self, owner, balance=0) 初始化 owner 與 balance（預設 0）',
      'top_up(self, amount)：當 amount > 0 時增加餘額並回傳最新餘額',
      'pay(self, amount)：餘額足夠時扣除並回傳 True；不足時不扣款並回傳 False',
    ],
    hint: '在 pay() 中先用 if amount <= self.balance: 判斷，足夠才執行 self.balance -= amount。',
    starterCode: `class Wallet:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def top_up(self, amount):
        # 若 amount > 0 則增加餘額
        return self.balance

    def pay(self, amount):
        # 餘額足夠扣款回傳 True，否則回傳 False
        return False`,
    solutionCode: `class Wallet:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def top_up(self, amount):
        if amount > 0:
            self.balance += amount
        return self.balance

    def pay(self, amount):
        if amount <= self.balance and amount > 0:
            self.balance -= amount
            return True
        return False`,
    testScript: `
__w = Wallet("阿哲")
print("TEST1:", __w.balance)
print("TEST2:", __w.top_up(300), __w.pay(120), __w.balance)
print("TEST3:", __w.pay(500), __w.balance)
`,
    testDescriptions: [
      '預設餘額應為 0',
      '儲值 300 後付款 120 應回傳 True 且餘額為 180',
      '嘗試付款 500 應回傳 False 且餘額維持 180',
    ],
  },
  {
    id: 'challenge-counter',
    order: '挑戰 03',
    title: '線上會員統計類別屬性',
    difficulty: '進階',
    prompt: '使用類別屬性追蹤總共註冊了幾位會員，並為每位會員指派遞增編號。',
    requirements: [
      '在 Member 類別中定義類別屬性 total_members = 0',
      '每建立一位新 Member(username) 時，Member.total_members 加 1',
      '將當下的編號存成實體屬性 self.member_id（第一位為 1，第二位為 2）',
    ],
    hint: '記得使用 Member.total_members += 1，而不是 self.total_members += 1，才能更新共用計數器。',
    starterCode: `class Member:
    total_members = 0

    def __init__(self, username):
        self.username = username
        # 請遞增 Member.total_members 並設定 self.member_id
        self.member_id = 0`,
    solutionCode: `class Member:
    total_members = 0

    def __init__(self, username):
        self.username = username
        Member.total_members += 1
        self.member_id = Member.total_members`,
    testScript: `
__m1 = Member("alice")
__m2 = Member("bob")
__m3 = Member("carol")
print("TEST1:", Member.total_members)
print("TEST2:", __m1.member_id, __m2.member_id, __m3.member_id)
print("TEST3:", __m2.username)
`,
    testDescriptions: [
      '建立 3 位會員後，Member.total_members 應為 3',
      '三位會員的 member_id 應依序為 1, 2, 3',
      '__m2.username 應正確保留為 "bob"',
    ],
  },
  {
    id: 'challenge-inheritance',
    order: '挑戰 04',
    title: 'RPG 職業繼承與 super()',
    difficulty: '進階',
    prompt: '讓 Warrior 繼承 Character，透過 super() 保留基礎屬性並強化攻擊方法。',
    requirements: [
      'Character 有 __init__(self, name, hp) 與 attack(self) 回傳 10',
      'Warrior(Character) 的 __init__(self, name, hp, bonus) 需呼叫 super().__init__(name, hp) 並儲存 self.bonus',
      'Warrior 覆寫 attack(self)，回傳 super().attack() + self.bonus',
    ],
    hint: '在 Warrior.__init__ 第一行寫 super().__init__(name, hp)，並在 attack() 中使用 super().attack() + self.bonus。',
    starterCode: `class Character:
    def __init__(self, name, hp):
        self.name = name
        self.hp = hp

    def attack(self):
        return 10

class Warrior(Character):
    def __init__(self, name, hp, bonus):
        # 請呼叫 super() 並設定 bonus
        self.bonus = bonus

    def attack(self):
        return 0`,
    solutionCode: `class Character:
    def __init__(self, name, hp):
        self.name = name
        self.hp = hp

    def attack(self):
        return 10

class Warrior(Character):
    def __init__(self, name, hp, bonus):
        super().__init__(name, hp)
        self.bonus = bonus

    def attack(self):
        return super().attack() + self.bonus`,
    testScript: `
__c = Character("初心者", 100)
__w = Warrior("亞瑟", 180, 15)
print("TEST1:", __c.attack())
print("TEST2:", __w.name, __w.hp, __w.attack())
print("TEST3:", isinstance(__w, Character))
`,
    testDescriptions: [
      'Character.attack() 應回傳 10',
      'Warrior("亞瑟", 180, 15) 應正確設定 name, hp 且 attack() 為 25',
      'isinstance(warrior, Character) 應為 True',
    ],
  },
  {
    id: 'challenge-cart',
    order: '挑戰 05',
    title: '購物車與商品物件互動',
    difficulty: '實戰',
    prompt: '設計兩個互相協作的類別：Item 代表商品，Cart 代表購物車並負責加總金額。',
    requirements: [
      'Item(name, price) 儲存 self.name 與 self.price',
      'Cart() 初始化 self.items = []',
      'Cart.add_item(self, item) 將 Item 物件加入 self.items，Cart.total(self) 回傳所有商品價格總和',
    ],
    hint: '在 total(self) 中建立 total_price = 0，用 for item in self.items: 累加 item.price。',
    starterCode: `class Item:
    def __init__(self, name, price):
        self.name = name
        self.price = price

class Cart:
    def __init__(self):
        self.items = []

    def add_item(self, item):
        pass

    def total(self):
        return 0`,
    solutionCode: `class Item:
    def __init__(self, name, price):
        self.name = name
        self.price = price

class Cart:
    def __init__(self):
        self.items = []

    def add_item(self, item):
        self.items.append(item)

    def total(self):
        sum_price = 0
        for item in self.items:
            sum_price += item.price
        return sum_price`,
    testScript: `
__cart = Cart()
__cart.add_item(Item("機械鍵盤", 2400))
__cart.add_item(Item("滑鼠墊", 450))
print("TEST1:", len(__cart.items))
print("TEST2:", __cart.total())
__cart.add_item(Item("螢幕支架", 1150))
print("TEST3:", __cart.total())
`,
    testDescriptions: [
      '加入 2 件商品後 len(cart.items) 應為 2',
      '前兩件商品 total() 應為 2850',
      '再加入 1150 元商品後 total() 應為 4000',
    ],
  },
];

export const EXPECTED_TEST_OUTPUTS: Record<string, string[]> = {
  'challenge-student': ['TEST1: 陳小明 78 True', 'TEST2: False', 'TEST3: 陳小明: 78分'],
  'challenge-wallet': ['TEST1: 0', 'TEST2: 300 True 180', 'TEST3: False 180'],
  'challenge-counter': ['TEST1: 3', 'TEST2: 1 2 3', 'TEST3: bob'],
  'challenge-inheritance': ['TEST1: 10', 'TEST2: 亞瑟 180 25', 'TEST3: True'],
  'challenge-cart': ['TEST1: 2', 'TEST2: 2850', 'TEST3: 4000'],
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    topic: '建構子與實體化',
    question: '在 Python 中建立類別實體 d = Dog("Lucky") 時，哪一個特殊方法會被自動呼叫來初始化物件屬性？',
    options: ['__start__', '__init__', '__create__', 'main()'],
    correctIndex: 1,
    explanation: '__init__ 是 Python 的初始化方法（常稱為建構子）。每當從類別建立新物件實體時，Python 會自動呼叫 __init__ 並將新物件傳入第一個參數 self。',
  },
  {
    id: 'q2',
    topic: 'self 參數機制',
    question: '執行下方程式碼時，a.add(5) 實際上會把什麼值傳入 add 方法的 self 參數？',
    codeSnippet: `class Counter:
    def __init__(self):
        self.value = 10
    def add(self, n):
        self.value += n

a = Counter()
b = Counter()
a.add(5)`,
    options: ['類別 Counter 本身', '數字 5', '變數 a 所指向的記憶體物件實體', '變數 b 所指向的記憶體物件實體'],
    correctIndex: 2,
    explanation: '呼叫 a.add(5) 時，Python 在底層會轉換成 Counter.add(a, 5)，因此 self 指向的就是呼叫者 a 所綁定的那個記憶體物件實體，b 完全不會被影響。',
  },
  {
    id: 'q3',
    topic: '類別屬性與實體屬性',
    question: '下列程式碼執行後，最後印出的結果為何？',
    codeSnippet: `class Cat:
    legs = 4

c1 = Cat()
c2 = Cat()
c1.legs = 3
print(c1.legs, c2.legs, Cat.legs)`,
    options: ['3 3 3', '3 4 4', '4 4 4', '發生 AttributeError'],
    correctIndex: 1,
    explanation: 'c1.legs = 3 會在實體 c1 自己的屬性字典建立一個獨立的 legs=3（遮蔽類別屬性），並不會修改類別 Cat 的 legs，因此 c2.legs 與 Cat.legs 仍然讀取類別屬性 4。',
  },
  {
    id: 'q4',
    topic: '繼承與方法覆寫',
    question: '當子類別 Child 繼承父類別 Parent 且兩者都有同名的 greet() 方法時，呼叫 child_obj.greet() 會發生什麼事？',
    options: [
      '會發生名稱衝突錯誤 (SyntaxError)',
      '只會執行父類別 Parent 的 greet()',
      '優先執行子類別 Child 覆寫後的 greet()',
      '會自動依序執行父類別與子類別兩次 greet()',
    ],
    correctIndex: 2,
    explanation: 'Python 查找屬性與方法會遵循 MRO（方法解析順序），先找物件與所屬子類別，找不到才往父類別尋找。因此子類別的同名方法會覆寫 (Override) 父類別。',
  },
  {
    id: 'q5',
    topic: 'super() 函式',
    question: '在子類別的 __init__ 中使用 super().__init__(...) 的主要目的是什麼？',
    options: [
      '把子類別轉換成父類別型別',
      '呼叫父類別的 __init__ 以重用其初始化邏輯',
      '刪除父類別的所有私有屬性',
      '強制讓所有屬性變成唯讀狀態',
    ],
    correctIndex: 1,
    explanation: 'super() 代表父類別代理物件。透過 super().__init__(...) 可以直接執行父類別的初始化程式碼，避免複製貼上重複邏輯。',
  },
  {
    id: 'q6',
    topic: '型別判斷',
    question: '若 class Manager(Employee): 且 m = Manager()，請問 isinstance(m, Employee) 的結果為何？',
    options: ['True', 'False', 'None', '只有 Manager 直接定義時才為 True'],
    correctIndex: 0,
    explanation: '繼承代表「是一種 (is-a)」的關係，Manager 繼承自 Employee，因此 m 同時也是 Employee 的實體，isinstance(m, Employee) 回傳 True。',
  },
  {
    id: 'q7',
    topic: '封裝與 @property',
    question: '在類別方法上方加上 @property 裝飾器後，呼叫該方法時有什麼改變？',
    options: [
      '必須傳入兩個以上參數才能呼叫',
      '該方法會變成靜態函式，無法使用 self',
      '可以像讀取一般屬性一樣 obj.prop 使用，不需加上小括號 ()',
      '該方法只能在類別內部呼叫，外部會出現權限錯誤',
    ],
    correctIndex: 2,
    explanation: '@property 能將一個僅接受 self 的方法包裝成「計算屬性」，讓外部用 obj.area 的形式取值，兼具方法動態計算與屬性簡潔語法的優點。',
  },
  {
    id: 'q8',
    topic: '記憶體與參考概念',
    question: '執行 p1 = Point(1, 2) 後再執行 p2 = p1，若接著執行 p2.x = 99，請問 p1.x 的值是多少？',
    options: ['1', '99', '2', 'None'],
    correctIndex: 1,
    explanation: 'p2 = p1 並沒有複製出一個新物件，而是讓變數 p2 指向與 p1 完全相同的記憶體位址。因此透過 p2 修改屬性，從 p1 讀取到的也會是 99。',
  },
];
