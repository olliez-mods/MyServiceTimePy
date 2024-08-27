def load_data_from_file(file_name:str) -> dict[str, str | int | bool | float]:
    # If no extension, default to .ini
    e = file_name.rfind(".")
    file_name = str(file_name+".ini" if e == -1 else file_name)

    data:dict[str, str | int | bool | float] = {}
    with open(str(file_name), 'r', encoding='utf-8') as file:
        for line in file:
            line = line.strip('\r\n')
            if(line.startswith("#") or "=" not in line): continue # Ignore comments and lines without "="
            left, right = line.split("=", 1)
            if(right.isnumeric()): right = int(right)
            elif(right.count(".") == 1 and right.replace(".", "").isnumeric()): right = float(right)
            elif(right.lower() == "false"): right = False
            elif(right.lower() == "true"): right = True
            data[left] = right
    return data